using Microsoft.EntityFrameworkCore;
using Npgsql;
using SaludDirecta.Application.Abstractions;
using SaludDirecta.Application.Common;
using SaludDirecta.Domain.Entities;

namespace SaludDirecta.Infrastructure.Persistence;

public sealed class AgendaRepository(AppDbContext db) : IAgendaRepository
{
    public async Task<IReadOnlyList<FranjaHoraria>> ObtenerFranjasAsync(Guid usuarioId, CancellationToken ct) =>
        await db.Franjas.Where(f => f.UsuarioId == usuarioId).ToListAsync(ct);

    public Task<ConfiguracionAgenda?> ObtenerConfiguracionAsync(Guid usuarioId, CancellationToken ct) =>
        db.ConfiguracionesAgenda.FirstOrDefaultAsync(c => c.UsuarioId == usuarioId, ct);

    public async Task GuardarAgendaAsync(
        Guid usuarioId, IReadOnlyList<FranjaHoraria> franjas, ConfiguracionAgenda configuracion, CancellationToken ct)
    {
        var existentes = await db.Franjas.Where(f => f.UsuarioId == usuarioId).ToListAsync(ct);
        db.Franjas.RemoveRange(existentes);
        db.Franjas.AddRange(franjas);

        // Una configuración cargada desde la base ya está seguida por EF; una nueva no.
        if (db.Entry(configuracion).State == EntityState.Detached)
            db.ConfiguracionesAgenda.Add(configuracion);

        // Un solo SaveChanges: se reemplaza toda la agenda o no se cambia nada.
        await db.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<Ausencia>> ListarAusenciasAsync(Guid usuarioId, CancellationToken ct) =>
        await db.Ausencias.Where(a => a.UsuarioId == usuarioId).OrderBy(a => a.Desde).ToListAsync(ct);

    public async Task AgregarAusenciaAsync(Ausencia ausencia, CancellationToken ct)
    {
        db.Ausencias.Add(ausencia);
        await db.SaveChangesAsync(ct);
    }

    public async Task<bool> EliminarAusenciaAsync(Guid id, Guid usuarioId, CancellationToken ct)
    {
        var ausencia = await db.Ausencias.FirstOrDefaultAsync(a => a.Id == id && a.UsuarioId == usuarioId, ct);
        if (ausencia is null) return false;

        db.Ausencias.Remove(ausencia);
        await db.SaveChangesAsync(ct);
        return true;
    }
}

public sealed class TurnoRepository(AppDbContext db) : ITurnoRepository
{
    public async Task<IReadOnlyList<Turno>> ListarActivosDelDiaAsync(
        Guid profesionalId, DateOnly fecha, CancellationToken ct)
    {
        var desde = fecha.ToDateTime(TimeOnly.MinValue);
        var hasta = desde.AddDays(1);

        return await db.Turnos
            .AsNoTracking()
            .Where(t => t.ProfesionalId == profesionalId
                        && t.Inicio >= desde && t.Inicio < hasta
                        && (t.Estado == EstadoTurno.Solicitado || t.Estado == EstadoTurno.Confirmado))
            .ToListAsync(ct);
    }

    public async Task AgregarAsync(Turno turno, CancellationToken ct)
    {
        db.Turnos.Add(turno);
        try
        {
            await db.SaveChangesAsync(ct);
        }
        // La restricción de la base de datos (sql/004) impide dos turnos activos superpuestos del mismo
        // profesional: si dos solicitudes llegan al mismo tiempo, una sola se guarda y la otra cae acá.
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException
        {
            SqlState: PostgresErrorCodes.ExclusionViolation or PostgresErrorCodes.UniqueViolation
        })
        {
            db.Entry(turno).State = EntityState.Detached;
            throw new TurnoOcupadoException("El horario elegido ya fue reservado por otro paciente.");
        }
    }

    public Task<Turno?> ObtenerAsync(Guid id, CancellationToken ct) =>
        db.Turnos.FirstOrDefaultAsync(t => t.Id == id, ct);

    public Task GuardarCambiosAsync(CancellationToken ct) => db.SaveChangesAsync(ct);

    public async Task<IReadOnlyList<Turno>> ListarDePacienteAsync(Guid pacienteId, CancellationToken ct) =>
        await db.Turnos.AsNoTracking().Where(t => t.PacienteId == pacienteId).OrderBy(t => t.Inicio).ToListAsync(ct);

    public async Task<IReadOnlyList<Turno>> ListarDeProfesionalAsync(Guid profesionalId, CancellationToken ct) =>
        await db.Turnos.AsNoTracking().Where(t => t.ProfesionalId == profesionalId).OrderBy(t => t.Inicio).ToListAsync(ct);
}
