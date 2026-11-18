namespace SaludDirecta.Application.Common;

/// <summary>
/// Los turnos se manejan en hora de Argentina (UTC-3, sin horario de verano), que es la del consultorio.
/// </summary>
public static class HoraLocal
{
    public const int DesfaseUtcHoras = -3;

    public static DateTime Ahora(TimeProvider reloj) =>
        DateTime.SpecifyKind(reloj.GetUtcNow().UtcDateTime.AddHours(DesfaseUtcHoras), DateTimeKind.Unspecified);

    /// <summary>Pasa una hora local del consultorio a UTC.</summary>
    public static DateTime AUtc(DateTime local) =>
        DateTime.SpecifyKind(local.AddHours(-DesfaseUtcHoras), DateTimeKind.Utc);
}
