using SaludDirecta.Domain.Entities;

namespace SaludDirecta.Application.Abstractions;

public interface IPerfilRepository
{
    Task<PerfilProfesional?> ObtenerPorUsuarioAsync(Guid usuarioId, CancellationToken ct);

    /// <summary>
    /// Guarda el perfil (lo crea si es nuevo). Si hay cambio de honorario, guarda también la fila del historial
    /// y el evento de auditoría en la misma operación: o se guarda todo o nada.
    /// </summary>
    Task GuardarAsync(
        PerfilProfesional perfil,
        HistorialHonorario? historial,
        EventoAuditoria? evento,
        CancellationToken ct);

    /// <summary>Historial de honorarios, del más reciente al más antiguo.</summary>
    Task<IReadOnlyList<HistorialHonorario>> ObtenerHistorialAsync(Guid usuarioId, CancellationToken ct);
}

public interface IPrestacionRepository
{
    /// <summary>Prestaciones activas del profesional, ordenadas por nombre.</summary>
    Task<IReadOnlyList<Prestacion>> ListarActivasAsync(Guid usuarioId, CancellationToken ct);

    /// <summary>Solo devuelve la prestación si es activa y pertenece a ese profesional.</summary>
    Task<Prestacion?> ObtenerAsync(Guid id, Guid usuarioId, CancellationToken ct);

    Task AgregarAsync(Prestacion prestacion, CancellationToken ct);

    /// <summary>Guarda los cambios de una prestación ya cargada con <see cref="ObtenerAsync"/>.</summary>
    Task GuardarCambiosAsync(CancellationToken ct);
}
