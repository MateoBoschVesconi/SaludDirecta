namespace SaludDirecta.Application.Turnos;

/// <summary><c>Fecha</c> como "yyyy-MM-dd" y <c>Hora</c> como "HH:mm". La prestación es opcional.</summary>
public sealed record ReservarTurnoRequest(Guid ProfesionalId, string? Fecha, string? Hora, Guid? PrestacionId);

/// <summary><c>Estado</c>: confirmado, cumplido, cancelado o ausente.</summary>
public sealed record CambiarEstadoTurnoRequest(string? Estado);

public sealed record TurnoDto(
    Guid Id,
    Guid ProfesionalId,
    string Profesional,
    Guid PacienteId,
    string Paciente,
    Guid? PrestacionId,
    string Fecha,
    string Hora,
    string HoraFin,
    int DuracionMinutos,
    string Estado,
    DateTime CreadoEn);
