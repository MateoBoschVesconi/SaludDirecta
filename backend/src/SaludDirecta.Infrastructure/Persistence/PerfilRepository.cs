using Microsoft.EntityFrameworkCore;
using SaludDirecta.Application.Abstractions;
using SaludDirecta.Domain.Entities;

namespace SaludDirecta.Infrastructure.Persistence;

public sealed class PerfilRepository(AppDbContext db) : IPerfilRepository
{
    public Task<PerfilProfesional?> ObtenerPorUsuarioAsync(Guid usuarioId, CancellationToken ct) =>
        db.Perfiles.FirstOrDefaultAsync(p => p.UsuarioId == usuarioId, ct);

    public async Task GuardarAsync(
        PerfilProfesional perfil,
        HistorialHonorario? historial,
        EventoAuditoria? evento,
        CancellationToken ct)
    {
        // Un perfil cargado desde la base ya está seguido por EF; uno nuevo no.
        if (db.Entry(perfil).State == EntityState.Detached)
            db.Perfiles.Add(perfil);

        if (historial is not null) db.HistorialHonorarios.Add(historial);
        if (evento is not null) db.Auditoria.Add(evento);

        // Un solo SaveChanges: perfil, historial y auditoría se guardan juntos o no se guarda nada.
        await db.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<HistorialHonorario>> ObtenerHistorialAsync(Guid usuarioId, CancellationToken ct) =>
        await db.HistorialHonorarios
            .Where(h => h.UsuarioId == usuarioId)
            .OrderByDescending(h => h.CambiadoEn)
            .ToListAsync(ct);
}

public sealed class PrestacionRepository(AppDbContext db) : IPrestacionRepository
{
    public async Task<IReadOnlyList<Prestacion>> ListarActivasAsync(Guid usuarioId, CancellationToken ct) =>
        await db.Prestaciones
            .Where(p => p.UsuarioId == usuarioId && p.Activa)
            .OrderBy(p => p.Nombre)
            .ToListAsync(ct);

    public Task<Prestacion?> ObtenerAsync(Guid id, Guid usuarioId, CancellationToken ct) =>
        db.Prestaciones.FirstOrDefaultAsync(p => p.Id == id && p.UsuarioId == usuarioId && p.Activa, ct);

    public async Task AgregarAsync(Prestacion prestacion, CancellationToken ct)
    {
        db.Prestaciones.Add(prestacion);
        await db.SaveChangesAsync(ct);
    }

    public Task GuardarCambiosAsync(CancellationToken ct) => db.SaveChangesAsync(ct);
}
