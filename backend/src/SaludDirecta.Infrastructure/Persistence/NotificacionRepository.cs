using Microsoft.EntityFrameworkCore;
using SaludDirecta.Application.Abstractions;
using SaludDirecta.Domain.Entities;

namespace SaludDirecta.Infrastructure.Persistence;

public sealed class NotificacionRepository(AppDbContext db) : INotificacionRepository
{
    public async Task AgregarAsync(IReadOnlyList<Notificacion> notificaciones, CancellationToken ct)
    {
        db.Notificaciones.AddRange(notificaciones);
        await db.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<Notificacion>> ListarPorEnviarAsync(DateTime ahoraUtc, int maximo, CancellationToken ct) =>
        await db.Notificaciones
            .Where(n => n.Estado == EstadoNotificacion.Pendiente && n.ProgramadaPara <= ahoraUtc)
            .OrderBy(n => n.ProgramadaPara)
            .Take(maximo)
            .ToListAsync(ct);

    public async Task<IReadOnlyList<Notificacion>> ListarPendientesDeTurnoAsync(Guid turnoId, CancellationToken ct) =>
        await db.Notificaciones
            .Where(n => n.TurnoId == turnoId && n.Estado == EstadoNotificacion.Pendiente)
            .ToListAsync(ct);

    public async Task<IReadOnlyList<Notificacion>> ListarDeUsuarioAsync(Guid usuarioId, int maximo, CancellationToken ct) =>
        await db.Notificaciones
            .Where(n => n.UsuarioId == usuarioId && n.Estado != EstadoNotificacion.Cancelada)
            .OrderByDescending(n => n.CreadoEn)
            .Take(maximo)
            .ToListAsync(ct);

    public Task<Notificacion?> ObtenerAsync(Guid id, CancellationToken ct) =>
        db.Notificaciones.FirstOrDefaultAsync(n => n.Id == id, ct);

    public Task GuardarCambiosAsync(CancellationToken ct) => db.SaveChangesAsync(ct);
}
