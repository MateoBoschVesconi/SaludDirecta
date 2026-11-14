using System.Globalization;
using SaludDirecta.Application.Abstractions;
using SaludDirecta.Application.Common;
using SaludDirecta.Domain.Entities;

namespace SaludDirecta.Application.Notificaciones;

/// <summary>
/// Observador de turnos que genera los avisos de la HU10: cuando se solicita, confirma o cancela un turno,
/// y un recordatorio automático antes de la hora del turno confirmado.
/// Solo crea las notificaciones; las envía el servicio de envíos en su próxima vuelta.
/// </summary>
public sealed class NotificadorDeTurnos(
    INotificacionRepository notificaciones,
    IUsuarioRepository usuarios,
    TimeProvider reloj) : ITurnoObservador
{
    /// <summary>Cuánto antes del turno sale el recordatorio.</summary>
    public static readonly TimeSpan AnticipacionRecordatorio = TimeSpan.FromHours(24);

    public async Task TurnoSolicitadoAsync(Turno turno, CancellationToken ct)
    {
        var (paciente, profesional) = await ObtenerPartesAsync(turno, ct);
        var ahora = reloj.GetUtcNow().UtcDateTime;
        var cuando = Describir(turno);

        await notificaciones.AgregarAsync(
        [
            Notificacion.Crear(turno.ProfesionalId, turno.Id, TipoNotificacion.TurnoSolicitado,
                "Nuevo turno solicitado",
                $"{paciente} solicitó un turno para el {cuando}. Podés confirmarlo desde tu agenda.",
                ahora, ahora),
            Notificacion.Crear(turno.PacienteId, turno.Id, TipoNotificacion.TurnoSolicitado,
                "Solicitud de turno registrada",
                $"Tu solicitud de turno con {profesional} para el {cuando} fue registrada. " +
                "Te avisamos cuando el profesional la confirme.",
                ahora, ahora)
        ], ct);
    }

    public async Task EstadoCambiadoAsync(Turno turno, Guid actorId, CancellationToken ct)
    {
        var ahora = reloj.GetUtcNow().UtcDateTime;
        var (paciente, profesional) = await ObtenerPartesAsync(turno, ct);
        var cuando = Describir(turno);

        switch (turno.Estado)
        {
            case EstadoTurno.Confirmado:
                await notificaciones.AgregarAsync(
                [
                    Notificacion.Crear(turno.PacienteId, turno.Id, TipoNotificacion.TurnoConfirmado,
                        "Turno confirmado",
                        $"{profesional} confirmó tu turno del {cuando}.", ahora, ahora),
                    Recordatorio(turno.PacienteId, turno, $"Recordatorio: tenés turno con {profesional} el {cuando}.", ahora),
                    Recordatorio(turno.ProfesionalId, turno, $"Recordatorio: tenés turno con {paciente} el {cuando}.", ahora)
                ], ct);
                break;

            case EstadoTurno.Cancelado:
                await CancelarRecordatoriosAsync(turno.Id, ct);

                // Se avisa a la otra parte, no a quien canceló.
                var destinatario = actorId == turno.PacienteId ? turno.ProfesionalId : turno.PacienteId;
                var quienCancelo = actorId == turno.PacienteId ? paciente : profesional;
                await notificaciones.AgregarAsync(
                [
                    Notificacion.Crear(destinatario, turno.Id, TipoNotificacion.TurnoCancelado,
                        "Turno cancelado",
                        $"{quienCancelo} canceló el turno del {cuando}.", ahora, ahora)
                ], ct);
                break;

            case EstadoTurno.Cumplido:
            case EstadoTurno.Ausente:
                // Ya pasó: no tiene sentido mandar recordatorios que quedaran pendientes.
                await CancelarRecordatoriosAsync(turno.Id, ct);
                break;
        }
    }

    private Notificacion Recordatorio(Guid usuarioId, Turno turno, string mensaje, DateTime ahoraUtc)
    {
        // Sale 24 horas antes; si el turno es más próximo que eso, sale enseguida.
        var programada = HoraLocal.AUtc(turno.Inicio) - AnticipacionRecordatorio;
        if (programada < ahoraUtc) programada = ahoraUtc;
        return Notificacion.Crear(usuarioId, turno.Id, TipoNotificacion.Recordatorio,
            "Recordatorio de turno", mensaje, programada, ahoraUtc);
    }

    private async Task CancelarRecordatoriosAsync(Guid turnoId, CancellationToken ct)
    {
        var pendientes = await notificaciones.ListarPendientesDeTurnoAsync(turnoId, ct);
        var recordatorios = pendientes.Where(n => n.Tipo == TipoNotificacion.Recordatorio).ToList();
        if (recordatorios.Count == 0) return;

        foreach (var recordatorio in recordatorios) recordatorio.Cancelar();
        await notificaciones.GuardarCambiosAsync(ct);
    }

    private async Task<(string Paciente, string Profesional)> ObtenerPartesAsync(Turno turno, CancellationToken ct)
    {
        var paciente = (await usuarios.ObtenerPorIdAsync(turno.PacienteId, ct))?.Nombre ?? "El paciente";
        var profesional = (await usuarios.ObtenerPorIdAsync(turno.ProfesionalId, ct))?.Nombre ?? "El profesional";
        return (paciente, profesional);
    }

    private static string Describir(Turno turno) =>
        $"{turno.Inicio.ToString("dd/MM/yyyy", CultureInfo.InvariantCulture)} a las " +
        turno.Inicio.ToString("HH:mm", CultureInfo.InvariantCulture);
}
