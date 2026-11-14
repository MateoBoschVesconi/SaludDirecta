using System.Globalization;
using SaludDirecta.Application.Abstractions;
using SaludDirecta.Application.Common;
using SaludDirecta.Application.Verificacion;
using SaludDirecta.Domain.Entities;

namespace SaludDirecta.Application.Perfil;

/// <summary>Casos de uso de HU4: perfil público, honorarios con historial y publicación.</summary>
public sealed class PerfilService(
    IUsuarioRepository usuarios,
    IPerfilRepository perfiles,
    IPrestacionRepository prestaciones,
    IVerificacionRepository verificaciones,
    TimeProvider reloj)
{
    public const string AccionAuditoria = "MODIFICACION_HONORARIOS";

    /// <summary>Perfil del profesional autenticado. Si todavía no lo completó, devuelve uno vacío.</summary>
    public async Task<PerfilDto> ObtenerMiPerfilAsync(Guid usuarioId, CancellationToken ct = default)
    {
        var usuario = await ObtenerProfesionalAsync(usuarioId, ct);
        var perfil = await perfiles.ObtenerPorUsuarioAsync(usuarioId, ct);
        return await ADtoAsync(usuario, perfil, ct);
    }

    /// <summary>Crea o actualiza los datos descriptivos y del consultorio.</summary>
    public async Task<PerfilDto> GuardarPerfilAsync(
        Guid usuarioId, GuardarPerfilRequest pedido, CancellationToken ct = default)
    {
        var usuario = await ObtenerProfesionalAsync(usuarioId, ct);
        var ahora = reloj.GetUtcNow().UtcDateTime;
        var perfil = await perfiles.ObtenerPorUsuarioAsync(usuarioId, ct)
                     ?? PerfilProfesional.Crear(usuarioId, ahora);

        ReglasDominio.Ejecutar(() => perfil.ActualizarDatos(
            pedido.Especialidad, pedido.Descripcion, pedido.Direccion, pedido.Ciudad, pedido.Telefono,
            pedido.DuracionSesionMinutos, pedido.TieneRampa, pedido.TieneAscensor, pedido.TieneBanoAdaptado,
            ahora));

        await perfiles.GuardarAsync(perfil, null, null, ct);
        return await ADtoAsync(usuario, perfil, ct);
    }

    /// <summary>
    /// Fija o modifica el honorario de la consulta. Si cambia, queda en el historial (criterio 2 de la HU4)
    /// y en la bitácora de auditoría (RNF-04).
    /// </summary>
    public async Task<PerfilDto> CambiarHonorarioAsync(
        Guid usuarioId, CambiarHonorarioRequest pedido, CancellationToken ct = default)
    {
        var usuario = await ObtenerProfesionalAsync(usuarioId, ct);
        var ahora = reloj.GetUtcNow().UtcDateTime;
        var perfil = await perfiles.ObtenerPorUsuarioAsync(usuarioId, ct)
                     ?? PerfilProfesional.Crear(usuarioId, ahora);

        var anterior = perfil.HonorarioConsulta;
        var cambio = ReglasDominio.Ejecutar(() => perfil.CambiarHonorario(pedido.Honorario, ahora));

        if (!cambio)
            return await ADtoAsync(usuario, perfil, ct); // mismo valor: no se registra nada

        var nuevo = perfil.HonorarioConsulta!.Value;
        var historial = HistorialHonorario.Crear(usuarioId, anterior, nuevo, ahora);
        var evento = EventoAuditoria.Crear(
            usuarioId,
            AccionAuditoria,
            $"Honorario de la consulta: {Formatear(anterior)} -> {Formatear(nuevo)}.",
            ahora);

        await perfiles.GuardarAsync(perfil, historial, evento, ct);
        return await ADtoAsync(usuario, perfil, ct);
    }

    /// <summary>Publica el perfil. Falla si todavía no tiene el valor de la consulta (criterio 1 de la HU4).</summary>
    public async Task<PerfilDto> PublicarAsync(Guid usuarioId, CancellationToken ct = default)
    {
        var usuario = await ObtenerProfesionalAsync(usuarioId, ct);
        var perfil = await perfiles.ObtenerPorUsuarioAsync(usuarioId, ct)
                     ?? throw new ValidacionException("No se puede publicar el perfil sin el valor de la consulta.");

        ReglasDominio.Ejecutar(() => perfil.Publicar(reloj.GetUtcNow().UtcDateTime));

        await perfiles.GuardarAsync(perfil, null, null, ct);
        return await ADtoAsync(usuario, perfil, ct);
    }

    public async Task<PerfilDto> DespublicarAsync(Guid usuarioId, CancellationToken ct = default)
    {
        var usuario = await ObtenerProfesionalAsync(usuarioId, ct);
        var perfil = await perfiles.ObtenerPorUsuarioAsync(usuarioId, ct);
        if (perfil is null) return await ADtoAsync(usuario, null, ct);

        perfil.Despublicar(reloj.GetUtcNow().UtcDateTime);
        await perfiles.GuardarAsync(perfil, null, null, ct);
        return await ADtoAsync(usuario, perfil, ct);
    }

    public async Task<IReadOnlyList<HonorarioHistorialDto>> ObtenerHistorialHonorariosAsync(
        Guid usuarioId, CancellationToken ct = default)
    {
        await ObtenerProfesionalAsync(usuarioId, ct);
        var historial = await perfiles.ObtenerHistorialAsync(usuarioId, ct);
        return historial
            .Select(h => new HonorarioHistorialDto(h.ValorAnterior, h.ValorNuevo, h.CambiadoEn))
            .ToList();
    }

    /// <summary>Vista pública del perfil. Solo existe para los perfiles publicados.</summary>
    public async Task<PerfilPublicoDto> ObtenerPerfilPublicoAsync(Guid profesionalId, CancellationToken ct = default)
    {
        const string noExiste = "El perfil no existe o no está publicado.";

        var usuario = await usuarios.ObtenerPorIdAsync(profesionalId, ct);
        if (usuario is null || usuario.Rol != Rol.Profesional)
            throw new NoEncontradoException(noExiste);

        var perfil = await perfiles.ObtenerPorUsuarioAsync(profesionalId, ct);
        if (perfil is not { Publicado: true, HonorarioConsulta: { } honorario })
            throw new NoEncontradoException(noExiste);

        var ultima = await verificaciones.ObtenerUltimaAsync(profesionalId, ct);
        var activas = await prestaciones.ListarActivasAsync(profesionalId, ct);

        return new PerfilPublicoDto(
            usuario.Id, usuario.Nombre, usuario.Profesion, perfil.Especialidad,
            usuario.Matricula, usuario.Jurisdiccion, perfil.Descripcion,
            perfil.Direccion, perfil.Ciudad, perfil.Telefono,
            honorario, perfil.DuracionSesionMinutos,
            perfil.TieneRampa, perfil.TieneAscensor, perfil.TieneBanoAdaptado,
            ultima is { OtorgaDistintivo: true },
            ultima is { OtorgaDistintivo: true } ? ultima.VerificadaEn : null,
            activas.Select(PrestacionService.ADto).ToList());
    }

    private async Task<Usuario> ObtenerProfesionalAsync(Guid usuarioId, CancellationToken ct)
    {
        var usuario = await usuarios.ObtenerPorIdAsync(usuarioId, ct)
                      ?? throw new CredencialesInvalidasException("La sesión no es válida.");

        if (usuario.Rol != Rol.Profesional)
            throw new ValidacionException("Solo los profesionales tienen un perfil público.");

        return usuario;
    }

    private async Task<PerfilDto> ADtoAsync(Usuario usuario, PerfilProfesional? perfil, CancellationToken ct)
    {
        var ultima = await verificaciones.ObtenerUltimaAsync(usuario.Id, ct);
        var verificacion = ultima is null
            ? new VerificacionDto("sin_verificar", false, "Todavía no se solicitó la verificación.", null, null)
            : new VerificacionDto(NombreEstado(ultima.Estado), ultima.OtorgaDistintivo,
                ultima.Motivo, ultima.Fuente, ultima.VerificadaEn);

        return new PerfilDto(
            usuario.Id, usuario.Nombre, usuario.Profesion, usuario.Matricula, usuario.Jurisdiccion,
            perfil?.Especialidad, perfil?.Descripcion, perfil?.Direccion, perfil?.Ciudad, perfil?.Telefono,
            perfil?.HonorarioConsulta,
            perfil?.DuracionSesionMinutos ?? PerfilProfesional.DuracionPorDefecto,
            perfil?.TieneRampa ?? false, perfil?.TieneAscensor ?? false, perfil?.TieneBanoAdaptado ?? false,
            perfil?.Publicado ?? false,
            verificacion,
            perfil?.ActualizadoEn);
    }

    private static string NombreEstado(EstadoVerificacion estado) => estado switch
    {
        EstadoVerificacion.Verificada => "verificada",
        EstadoVerificacion.RevisionManual => "revision_manual",
        _ => "rechazada"
    };

    private static string Formatear(decimal? valor) =>
        valor is null ? "sin definir" : "$" + valor.Value.ToString("0.00", CultureInfo.InvariantCulture);
}
