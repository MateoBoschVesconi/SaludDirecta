namespace SaludDirecta.Application.Notificaciones;

public sealed record NotificacionDto(
    Guid Id,
    Guid TurnoId,
    string Tipo,
    string Asunto,
    string Mensaje,
    string Estado,
    bool Leida,
    DateTime ProgramadaPara,
    DateTime? EnviadaEn,
    DateTime CreadoEn);
