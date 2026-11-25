using Microsoft.EntityFrameworkCore;
using SaludDirecta.Application.Abstractions;
using SaludDirecta.Domain.Entities;

namespace SaludDirecta.Infrastructure.Persistence;

public sealed class CuentaRepository(AppDbContext db) : ICuentaRepository
{
    public async Task EliminarDatosPersonalesAsync(Usuario usuario, EventoAuditoria evento, CancellationToken ct)
    {
        var id = usuario.Id;

        // Una sola transacción: si algo falla, no queda la cuenta a medio borrar.
        await using var transaccion = await db.Database.BeginTransactionAsync(ct);

        await db.Franjas.Where(f => f.UsuarioId == id).ExecuteDeleteAsync(ct);
        await db.Ausencias.Where(a => a.UsuarioId == id).ExecuteDeleteAsync(ct);
        await db.ConfiguracionesAgenda.Where(c => c.UsuarioId == id).ExecuteDeleteAsync(ct);
        await db.HistorialHonorarios.Where(h => h.UsuarioId == id).ExecuteDeleteAsync(ct);
        await db.Perfiles.Where(p => p.UsuarioId == id).ExecuteDeleteAsync(ct);
        await db.Verificaciones.Where(v => v.UsuarioId == id).ExecuteDeleteAsync(ct);
        await db.Notificaciones.Where(n => n.UsuarioId == id).ExecuteDeleteAsync(ct);

        // Las prestaciones no se borran: se dan de baja, igual que cuando las quita el propio profesional.
        await db.Prestaciones.Where(p => p.UsuarioId == id).ExecuteUpdateAsync(
            s => s.SetProperty(p => p.Activa, false), ct);

        // Guarda la cuenta anonimizada, los turnos cancelados y el evento de auditoría.
        db.Auditoria.Add(evento);
        await db.SaveChangesAsync(ct);

        await transaccion.CommitAsync(ct);
    }
}
