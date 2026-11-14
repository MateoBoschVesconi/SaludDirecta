using SaludDirecta.Domain.Exceptions;

namespace SaludDirecta.Domain.Entities;

/// <summary>
/// Franja de atención de un profesional en un día de la semana (HU8), por ejemplo lunes de 08:30 a 12:30.
/// Un día puede tener varias (mañana y tarde).
/// </summary>
public sealed class FranjaHoraria
{
    private FranjaHoraria() { } // Requerido por EF Core

    public Guid Id { get; private set; }
    public Guid UsuarioId { get; private set; }

    /// <summary>0 = domingo, 1 = lunes ... 6 = sábado (igual que getDay() en JavaScript y DayOfWeek en .NET).</summary>
    public int DiaSemana { get; private set; }

    public TimeOnly Desde { get; private set; }
    public TimeOnly Hasta { get; private set; }

    public static FranjaHoraria Crear(Guid usuarioId, int diaSemana, TimeOnly desde, TimeOnly hasta)
    {
        if (diaSemana is < 0 or > 6)
            throw new DominioException("El día de la semana debe estar entre 0 (domingo) y 6 (sábado).");
        if (desde >= hasta)
            throw new DominioException("La hora de inicio de la franja debe ser anterior a la hora de fin.");

        return new FranjaHoraria
        {
            Id = Guid.NewGuid(),
            UsuarioId = usuarioId,
            DiaSemana = diaSemana,
            Desde = desde,
            Hasta = hasta
        };
    }
}
