namespace SaludDirecta.Application.Verificacion;

/// <summary>
/// Estado: "verificada", "revision_manual", "rechazada" o "sin_verificar" (todavía no se pidió verificación).
/// </summary>
public sealed record VerificacionDto(
    string Estado,
    bool Distintivo,
    string Motivo,
    string? Fuente,
    DateTime? VerificadaEn);

/// <summary>Dato público para mostrar el distintivo en el perfil.</summary>
public sealed record DistintivoDto(bool Verificado, DateTime? VerificadaEn);
