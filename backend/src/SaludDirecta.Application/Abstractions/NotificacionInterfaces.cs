using SaludDirecta.Domain.Entities;

namespace SaludDirecta.Application.Abstractions;

public interface INotificacionRepository
{
    Task AgregarAsync(IReadOnlyList<Notificacion> notificaciones, CancellationToken ct);

    /// <summary>Pendientes cuyo momento de envío ya llegó, de la más antigua a la más nueva.</summary>
    Task<IReadOnlyList<Notificacion>> ListarPorEnviarAsync(DateTime ahoraUtc, int maximo, CancellationToken ct);

    /// <summary>Pendientes de un turno (por ejemplo, sus recordatorios).</summary>
    Task<IReadOnlyList<Notificacion>> ListarPendientesDeTurnoAsync(Guid turnoId, CancellationToken ct);

    /// <summary>Las notificaciones del usuario, de la más nueva a la más vieja, sin las canceladas.</summary>
    Task<IReadOnlyList<Notificacion>> ListarDeUsuarioAsync(Guid usuarioId, int maximo, CancellationToken ct);

    Task<Notificacion?> ObtenerAsync(Guid id, CancellationToken ct);

    /// <summary>Guarda los cambios de notificaciones ya cargadas con alguno de los métodos anteriores.</summary>
    Task GuardarCambiosAsync(CancellationToken ct);
}

/// <summary>
/// Canal por el que sale una notificación (mail, SMS, WhatsApp...). Hoy hay uno simulado que deja el aviso
/// en el registro del sistema; para mandar mails reales se escribe otra clase que implemente esta interfaz
/// y se registra en lugar de la simulada, sin tocar la lógica de turnos.
/// </summary>
public interface IEnviadorNotificaciones
{
    Task EnviarAsync(Notificacion notificacion, Usuario destinatario, CancellationToken ct);
}

/// <summary>
/// Observador de los turnos (patrón Observer). El servicio de turnos avisa lo que pasa y cada observador
/// decide qué hacer, así reservar un turno no depende de cómo se notifica.
/// </summary>
public interface ITurnoObservador
{
    Task TurnoSolicitadoAsync(Turno turno, CancellationToken ct);

    /// <param name="actorId">Quién hizo el cambio (el paciente o el profesional).</param>
    Task EstadoCambiadoAsync(Turno turno, Guid actorId, CancellationToken ct);
}
