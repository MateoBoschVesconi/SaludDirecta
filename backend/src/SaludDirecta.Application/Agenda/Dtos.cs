namespace SaludDirecta.Application.Agenda;

/// <summary>Franja de atención. <c>Desde</c> y <c>Hasta</c> van como "HH:mm" (por ejemplo "08:30").</summary>
public sealed record FranjaDto(int DiaSemana, string Desde, string Hasta);

public sealed record AgendaDto(
    IReadOnlyList<FranjaDto> Franjas,
    int DescansoEntreSesionesMinutos,
    int AnticipacionMinimaHoras);

public sealed record GuardarAgendaRequest(
    IReadOnlyList<FranjaDto>? Franjas,
    int DescansoEntreSesionesMinutos,
    int AnticipacionMinimaHoras);

/// <summary>Las fechas van como "yyyy-MM-dd" (por ejemplo "2026-11-20").</summary>
public sealed record CrearAusenciaRequest(string? Desde, string? Hasta, string? Motivo);

public sealed record AusenciaDto(Guid Id, string Desde, string Hasta, string Motivo);

public sealed record HorariosDisponiblesDto(string Fecha, int DuracionMinutos, IReadOnlyList<string> Horarios);

/// <summary>Resultado interno del cálculo de un día: todos los horarios posibles y los que siguen libres.</summary>
public sealed record DisponibilidadDia(
    int DuracionMinutos,
    IReadOnlyList<TimeOnly> Posibles,
    IReadOnlyList<TimeOnly> Libres);
