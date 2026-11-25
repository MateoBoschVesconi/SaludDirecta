using System.Globalization;
using SaludDirecta.Application.Abstractions;
using SaludDirecta.Application.Agenda;
using SaludDirecta.Application.Common;
using SaludDirecta.Domain.Entities;

namespace SaludDirecta.Application.Cuenta;

/// <summary>
/// HU14, privacidad (Ley 25.326): el titular puede ver todo lo que el sistema guarda sobre él (acceso)
/// y pedir que se borren sus datos personales (supresión).
/// </summary>
public sealed class CuentaService(
    IUsuarioRepository usuarios,
    IPasswordHasher hasher,
    IPerfilRepository perfiles,
    ITurnoRepository turnos,
    INotificacionRepository notificaciones,
    ICuentaRepository cuentas,
    IEnumerable<ITurnoObservador> observadores,
    TimeProvider reloj)
{
    private const int MaximoNotificacionesExportadas = 1000;

    // ---------- Derecho de acceso ----------

    public async Task<DatosPersonalesDto> ExportarMisDatosAsync(Guid usuarioId, CancellationToken ct = default)
    {
        var usuario = await ObtenerUsuarioAsync(usuarioId, ct);

        var cuenta = new CuentaExportada(
            usuario.Id, usuario.Nombre, usuario.Email, usuario.Telefono,
            usuario.Rol.ToString().ToLowerInvariant(),
            usuario.Profesion, usuario.Matricula, usuario.Jurisdiccion,
            usuario.ConsentimientoAceptadoEn, usuario.CreadoEn);

        PerfilExportado? perfilExportado = null;
        if (usuario.Rol == Rol.Profesional)
        {
            var perfil = await perfiles.ObtenerPorUsuarioAsync(usuarioId, ct);
            if (perfil is not null)
                perfilExportado = new PerfilExportado(
                    perfil.Especialidad, perfil.Descripcion, perfil.Direccion, perfil.Ciudad, perfil.Telefono,
                    perfil.HonorarioConsulta, perfil.DuracionSesionMinutos, perfil.Publicado);
        }

        var misTurnos = await ListarTurnosAsync(usuario, ct);
        var nombres = new Dictionary<Guid, string>();
        var turnosExportados = new List<TurnoExportado>();
        foreach (var turno in misTurnos.OrderBy(t => t.Inicio))
        {
            var otraPersona = usuario.Rol == Rol.Profesional ? turno.PacienteId : turno.ProfesionalId;
            turnosExportados.Add(new TurnoExportado(
                turno.Id,
                turno.Inicio.ToString(AgendaService.FormatoFecha, CultureInfo.InvariantCulture),
                turno.Inicio.ToString(AgendaService.FormatoHora, CultureInfo.InvariantCulture),
                turno.Estado.ToString().ToLowerInvariant(),
                await NombreAsync(otraPersona, nombres, ct)));
        }

        var avisos = await notificaciones.ListarDeUsuarioAsync(usuarioId, MaximoNotificacionesExportadas, ct);

        return new DatosPersonalesDto(
            reloj.GetUtcNow().UtcDateTime,
            cuenta,
            perfilExportado,
            turnosExportados,
            avisos.Select(n => new NotificacionExportada(
                n.Tipo.ToString().ToLowerInvariant(), n.Asunto, n.Mensaje, n.CreadoEn)).ToList());
    }

    // ---------- Derecho de supresión ----------

    /// <summary>
    /// Elimina la cuenta: pide la contraseña, cancela los turnos activos (avisando a la otra parte), borra los
    /// datos personales y anonimiza la cuenta. La bitácora de auditoría conserva el hecho, sin datos personales.
    /// </summary>
    public async Task<CuentaEliminadaDto> EliminarCuentaAsync(
        Guid usuarioId, EliminarCuentaRequest pedido, CancellationToken ct = default)
    {
        var usuario = await ObtenerUsuarioAsync(usuarioId, ct);

        if (string.IsNullOrEmpty(pedido.Password) || !hasher.Verificar(pedido.Password, usuario.PasswordHash))
            throw new ValidacionException("La contraseña no es correcta. Hay que confirmarla para eliminar la cuenta.");

        var ahora = reloj.GetUtcNow().UtcDateTime;

        // Los turnos que todavía ocupan horario se cancelan: la otra persona no puede quedar esperando a alguien
        // que ya no existe. El estado queda anotado en memoria y se guarda junto con el borrado, en una sola
        // transacción (todos los repositorios de la solicitud comparten el mismo contexto de base de datos).
        var activos = (await ListarTurnosAsync(usuario, ct)).Where(t => t.OcupaHorario).ToList();
        foreach (var turno in activos)
            ReglasDominio.Ejecutar(() => turno.CambiarEstado(EstadoTurno.Cancelado, ahora));

        usuario.Anonimizar(ahora);

        // Se anota el hecho sin datos personales: la bitácora no se modifica ni se borra (RNF-04).
        var evento = EventoAuditoria.Crear(usuarioId, "ELIMINACION_CUENTA",
            $"Cuenta de {usuario.Rol.ToString().ToLowerInvariant()} eliminada a pedido del titular. " +
            $"Turnos activos cancelados: {activos.Count}.", ahora);

        await cuentas.EliminarDatosPersonalesAsync(usuario, evento, ct);

        // Con la cuenta ya eliminada se avisa a la otra parte de cada turno cancelado.
        foreach (var turno in activos)
            await NotificarAsync(o => o.EstadoCambiadoAsync(turno, usuarioId, ct), ct);

        return new CuentaEliminadaDto(activos.Count);
    }

    // ---------- Internos ----------

    private async Task<Usuario> ObtenerUsuarioAsync(Guid usuarioId, CancellationToken ct) =>
        await usuarios.ObtenerPorIdAsync(usuarioId, ct)
        ?? throw new CredencialesInvalidasException("La sesión no es válida.");

    private Task<IReadOnlyList<Turno>> ListarTurnosAsync(Usuario usuario, CancellationToken ct) =>
        usuario.Rol == Rol.Profesional
            ? turnos.ListarDeProfesionalAsync(usuario.Id, ct)
            : turnos.ListarDePacienteAsync(usuario.Id, ct);

    private async Task<string> NombreAsync(Guid usuarioId, Dictionary<Guid, string> cache, CancellationToken ct)
    {
        if (cache.TryGetValue(usuarioId, out var nombre)) return nombre;
        nombre = (await usuarios.ObtenerPorIdAsync(usuarioId, ct))?.Nombre ?? "Usuario eliminado";
        cache[usuarioId] = nombre;
        return nombre;
    }

    /// <summary>Un aviso que falla no deshace el borrado, que ya está hecho.</summary>
    private async Task NotificarAsync(Func<ITurnoObservador, Task> aviso, CancellationToken ct)
    {
        foreach (var observador in observadores)
        {
            try
            {
                await aviso(observador);
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception)
            {
                // La notificación es secundaria respecto del borrado.
            }
        }
    }
}
