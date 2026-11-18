using Microsoft.EntityFrameworkCore;
using SaludDirecta.Application.Abstractions;
using SaludDirecta.Domain.Entities;

namespace SaludDirecta.Infrastructure.Persistence;

public sealed class VerificacionRepository(AppDbContext db) : IVerificacionRepository
{
    public async Task RegistrarAsync(VerificacionMatricula verificacion, EventoAuditoria evento, CancellationToken ct)
    {
        // Un solo SaveChanges: o se guardan las dos cosas o ninguna.
        db.Verificaciones.Add(verificacion);
        db.Auditoria.Add(evento);
        await db.SaveChangesAsync(ct);
    }

    public Task<VerificacionMatricula?> ObtenerUltimaAsync(Guid usuarioId, CancellationToken ct) =>
        db.Verificaciones
            .Where(v => v.UsuarioId == usuarioId)
            .OrderByDescending(v => v.VerificadaEn)
            .FirstOrDefaultAsync(ct);
}
