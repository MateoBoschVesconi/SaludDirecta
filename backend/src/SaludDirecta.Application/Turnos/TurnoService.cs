using System.Globalization;
using SaludDirecta.Application.Abstractions;
using SaludDirecta.Application.Agenda;
using SaludDirecta.Application.Common;
using SaludDirecta.Domain.Entities;

namespace SaludDirecta.Application.Turnos;

/// <summary>HU9: reserva con control de concurrencia, máquina de estados y consulta de turnos.</summary>
public sealed class TurnoService(
    ITurnoRepository turnos,
    AgendaService agenda,
    IUsuarioRepository usuarios,
    TimeProvider reloj)
{
    public const string MensajeOcupado = "El horario elegido ya fue reservado por otro paciente.";

    /// <summary>
    /// Reserva un turno. Dos solicitudes para el mismo horario nunca generan doble asignación (criterio 1):
    /// primero se verifica la disponibilidad y, si otra solicitud se adelantó en el mismo instante,
    /// la base de datos rechaza la segunda y el paciente recibe <see cref="TurnoOcupadoException"/>.
    /// </summary>
    public async Task<TurnoDto> ReservarAsync(Guid pacienteId, ReservarTurnoRequest pedido, CancellationToken ct = default)
    {
        var paciente = await usuarios.ObtenerPorIdAsync(pacienteId, ct)
                       ?? throw new CredencialesInvalidasException("La sesión no es válida.");
        if (paciente.Rol != Rol.Paciente)
            throw new ValidacionException("Solo los pacientes pueden reservar turnos.");

        var fecha = AgendaService.LeerFecha(pedido.Fecha);
        var hora = AgendaService.LeerHora(pedido.Hora);

        var disponibilidad = await agenda.CalcularDisponibilidadAsync(
            pedido.ProfesionalId, fecha, pedido.PrestacionId, ct);

        if (!disponibilidad.Posibles.Contains(hora))
            throw new ValidacionException(
                "El horario elegido no está disponible: está fuera de la agenda del profesional, " +
                "dentro de una ausencia, no respeta el aviso mínimo o ya pasó.");

        if (!disponibilidad.Libres.Contains(hora))
            throw new TurnoOcupadoException(MensajeOcupado);

        var turno = Turno.Crear(
            pedido.ProfesionalId, pacienteId, pedido.PrestacionId,
            fecha.ToDateTime(hora), disponibilidad.DuracionMinutos, reloj.GetUtcNow().UtcDateTime);

        await turnos.AgregarAsync(turno, ct); // si otro ganó la carrera, lanza TurnoOcupadoException

        return await ADtoAsync(turno, new Dictionary<Guid, string>(), ct);
    }

    /// <summary>Un turno solo lo ven su paciente y su profesional (criterio 3).</summary>
    public async Task<TurnoDto> ObtenerAsync(Guid usuarioId, Guid turnoId, CancellationToken ct = default)
    {
        var turno = await ObtenerDelParticipanteAsync(usuarioId, turnoId, ct);
        return await ADtoAsync(turno, new Dictionary<Guid, string>(), ct);
    }

    /// <summary>Los turnos del usuario: los que pidió si es paciente, los que le piden si es profesional.</summary>
    public async Task<IReadOnlyList<TurnoDto>> ListarMisTurnosAsync(Guid usuarioId, CancellationToken ct = default)
    {
        var usuario = await usuarios.ObtenerPorIdAsync(usuarioId, ct)
                      ?? throw new CredencialesInvalidasException("La sesión no es válida.");

        var lista = usuario.Rol == Rol.Profesional
            ? await turnos.ListarDeProfesionalAsync(usuarioId, ct)
            : await turnos.ListarDePacienteAsync(usuarioId, ct);

        var nombres = new Dictionary<Guid, string>();
        var resultado = new List<TurnoDto>();
        foreach (var turno in lista.OrderBy(t => t.Inicio))
            resultado.Add(await ADtoAsync(turno, nombres, ct));
        return resultado;
    }

    /// <summary>
    /// Cambia el estado del turno por una transición válida (criterio 2).
    /// El paciente solo puede cancelar; el profesional puede confirmar, cancelar o marcar cumplido o ausente.
    /// </summary>
    public async Task<TurnoDto> CambiarEstadoAsync(
        Guid usuarioId, Guid turnoId, CambiarEstadoTurnoRequest pedido, CancellationToken ct = default)
    {
        if (!Enum.TryParse<EstadoTurno>(pedido.Estado?.Trim(), true, out var nuevo)
            || !Enum.IsDefined(nuevo) || nuevo == EstadoTurno.Solicitado)
            throw new ValidacionException("El estado debe ser confirmado, cumplido, cancelado o ausente.");

        var turno = await ObtenerDelParticipanteAsync(usuarioId, turnoId, ct);

        if (turno.PacienteId == usuarioId && nuevo != EstadoTurno.Cancelado)
            throw new ValidacionException("El paciente solo puede cancelar el turno.");

        ReglasDominio.Ejecutar(() => turno.CambiarEstado(nuevo, reloj.GetUtcNow().UtcDateTime));
        await turnos.GuardarCambiosAsync(ct);

        return await ADtoAsync(turno, new Dictionary<Guid, string>(), ct);
    }

    private async Task<Turno> ObtenerDelParticipanteAsync(Guid usuarioId, Guid turnoId, CancellationToken ct)
    {
        var turno = await turnos.ObtenerAsync(turnoId, ct);

        // Si el turno es de otras personas se responde "no existe", para no revelar que existe.
        if (turno is null || (turno.PacienteId != usuarioId && turno.ProfesionalId != usuarioId))
            throw new NoEncontradoException("El turno no existe.");

        return turno;
    }

    private async Task<TurnoDto> ADtoAsync(Turno t, Dictionary<Guid, string> nombres, CancellationToken ct) => new(
        t.Id,
        t.ProfesionalId, await NombreAsync(t.ProfesionalId, nombres, ct),
        t.PacienteId, await NombreAsync(t.PacienteId, nombres, ct),
        t.PrestacionId,
        t.Inicio.ToString(AgendaService.FormatoFecha, CultureInfo.InvariantCulture),
        t.Inicio.ToString(AgendaService.FormatoHora, CultureInfo.InvariantCulture),
        t.Fin.ToString(AgendaService.FormatoHora, CultureInfo.InvariantCulture),
        t.DuracionMinutos,
        t.Estado.ToString().ToLowerInvariant(),
        t.CreadoEn);

    private async Task<string> NombreAsync(Guid usuarioId, Dictionary<Guid, string> cache, CancellationToken ct)
    {
        if (cache.TryGetValue(usuarioId, out var nombre)) return nombre;
        nombre = (await usuarios.ObtenerPorIdAsync(usuarioId, ct))?.Nombre ?? "Usuario";
        cache[usuarioId] = nombre;
        return nombre;
    }
}
