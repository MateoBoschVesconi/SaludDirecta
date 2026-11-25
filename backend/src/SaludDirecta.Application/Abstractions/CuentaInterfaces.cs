using SaludDirecta.Domain.Entities;

namespace SaludDirecta.Application.Abstractions;

public interface ICuentaRepository
{
    /// <summary>
    /// Borra los datos personales del usuario (perfil, agenda, ausencias, verificaciones de matrícula y
    /// notificaciones), da de baja sus prestaciones y guarda la cuenta ya anonimizada junto con el evento de
    /// auditoría. Todo en una sola transacción: o se hace todo o no se cambia nada.
    /// También guarda los cambios pendientes de las demás entidades cargadas en la solicitud
    /// (por ejemplo, los turnos que se cancelaron justo antes).
    /// </summary>
    Task EliminarDatosPersonalesAsync(Usuario usuario, EventoAuditoria evento, CancellationToken ct);
}
