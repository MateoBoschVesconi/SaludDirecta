using SaludDirecta.Domain.Entities;

namespace SaludDirecta.Application.Abstractions;

public interface IAgendaRepository
{
    Task<IReadOnlyList<FranjaHoraria>> ObtenerFranjasAsync(Guid usuarioId, CancellationToken ct);

    Task<ConfiguracionAgenda?> ObtenerConfiguracionAsync(Guid usuarioId, CancellationToken ct);

    /// <summary>Reemplaza todas las franjas del profesional y guarda su configuración, en una sola operación.</summary>
    Task GuardarAgendaAsync(
        Guid usuarioId, IReadOnlyList<FranjaHoraria> franjas, ConfiguracionAgenda configuracion, CancellationToken ct);

    /// <summary>Ausencias del profesional, de la más próxima a la más lejana.</summary>
    Task<IReadOnlyList<Ausencia>> ListarAusenciasAsync(Guid usuarioId, CancellationToken ct);

    Task AgregarAusenciaAsync(Ausencia ausencia, CancellationToken ct);

    /// <summary>Devuelve false si la ausencia no existe o es de otro profesional.</summary>
    Task<bool> EliminarAusenciaAsync(Guid id, Guid usuarioId, CancellationToken ct);
}

public interface ITurnoRepository
{
    /// <summary>Turnos que ocupan horario (solicitados o confirmados) de un profesional en una fecha.</summary>
    Task<IReadOnlyList<Turno>> ListarActivosDelDiaAsync(Guid profesionalId, DateOnly fecha, CancellationToken ct);

    /// <summary>
    /// Guarda un turno nuevo. La base de datos impide que dos turnos activos del mismo profesional se superpongan:
    /// si otro se adelantó, lanza <see cref="Common.TurnoOcupadoException"/>.
    /// </summary>
    Task AgregarAsync(Turno turno, CancellationToken ct);

    Task<Turno?> ObtenerAsync(Guid id, CancellationToken ct);

    /// <summary>Guarda los cambios de un turno ya cargado con <see cref="ObtenerAsync"/>.</summary>
    Task GuardarCambiosAsync(CancellationToken ct);

    Task<IReadOnlyList<Turno>> ListarDePacienteAsync(Guid pacienteId, CancellationToken ct);
    Task<IReadOnlyList<Turno>> ListarDeProfesionalAsync(Guid profesionalId, CancellationToken ct);
}
