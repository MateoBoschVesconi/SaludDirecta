using SaludDirecta.Domain.Exceptions;

namespace SaludDirecta.Domain.Entities;

/// <summary>
/// Turno entre un paciente y un profesional (HU9). Las fechas y horas son las del consultorio (hora de Argentina),
/// sin zona horaria. El turno pasa solo por estados válidos (patrón State).
/// </summary>
public sealed class Turno
{
    private Turno() { } // Requerido por EF Core

    public Guid Id { get; private set; }
    public Guid ProfesionalId { get; private set; }
    public Guid PacienteId { get; private set; }

    /// <summary>Prestación elegida. Null si se usó la duración de sesión por defecto del profesional.</summary>
    public Guid? PrestacionId { get; private set; }

    public DateTime Inicio { get; private set; }
    public DateTime Fin { get; private set; }
    public int DuracionMinutos { get; private set; }
    public EstadoTurno Estado { get; private set; }
    public DateTime CreadoEn { get; private set; }
    public DateTime ActualizadoEn { get; private set; }

    /// <summary>Un turno solicitado o confirmado ocupa el horario; los demás estados lo liberan.</summary>
    public bool OcupaHorario => Estado is EstadoTurno.Solicitado or EstadoTurno.Confirmado;

    public static Turno Crear(
        Guid profesionalId, Guid pacienteId, Guid? prestacionId,
        DateTime inicio, int duracionMinutos, DateTime ahoraUtc)
    {
        if (duracionMinutos <= 0)
            throw new DominioException("La duración del turno debe ser mayor a cero.");

        inicio = DateTime.SpecifyKind(inicio, DateTimeKind.Unspecified);
        return new Turno
        {
            Id = Guid.NewGuid(),
            ProfesionalId = profesionalId,
            PacienteId = pacienteId,
            PrestacionId = prestacionId,
            Inicio = inicio,
            Fin = inicio.AddMinutes(duracionMinutos),
            DuracionMinutos = duracionMinutos,
            Estado = EstadoTurno.Solicitado,
            CreadoEn = ahoraUtc,
            ActualizadoEn = ahoraUtc
        };
    }

    /// <summary>Criterio 2 de la HU9: solicitado → confirmado o cancelado; confirmado → cumplido, ausente o cancelado.</summary>
    public static bool PuedeTransitar(EstadoTurno actual, EstadoTurno nuevo) => actual switch
    {
        EstadoTurno.Solicitado => nuevo is EstadoTurno.Confirmado or EstadoTurno.Cancelado,
        EstadoTurno.Confirmado => nuevo is EstadoTurno.Cumplido or EstadoTurno.Ausente or EstadoTurno.Cancelado,
        _ => false // cumplido, cancelado y ausente son estados finales
    };

    public void CambiarEstado(EstadoTurno nuevo, DateTime ahoraUtc)
    {
        if (!PuedeTransitar(Estado, nuevo))
            throw new DominioException(
                $"No se puede pasar un turno de {Estado.ToString().ToLowerInvariant()} a {nuevo.ToString().ToLowerInvariant()}.");

        Estado = nuevo;
        ActualizadoEn = ahoraUtc;
    }

    public bool Solapa(DateTime inicio, DateTime fin) => Inicio < fin && inicio < Fin;
}
