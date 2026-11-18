using SaludDirecta.Domain.Exceptions;

namespace SaludDirecta.Domain.Entities;

/// <summary>Período en el que el profesional no atiende (vacaciones, congreso, licencia). Bloquea la reserva (HU8).</summary>
public sealed class Ausencia
{
    private Ausencia() { } // Requerido por EF Core

    public Guid Id { get; private set; }
    public Guid UsuarioId { get; private set; }
    public DateOnly Desde { get; private set; }
    public DateOnly Hasta { get; private set; }
    public string Motivo { get; private set; } = string.Empty;
    public DateTime CreadoEn { get; private set; }

    public static Ausencia Crear(Guid usuarioId, DateOnly desde, DateOnly hasta, string? motivo, DateTime ahoraUtc)
    {
        if (hasta < desde)
            throw new DominioException("La fecha de inicio de la ausencia no puede ser posterior a la de fin.");

        var limpio = motivo?.Trim();
        if (string.IsNullOrEmpty(limpio))
            throw new DominioException("El motivo de la ausencia es obligatorio.");
        if (limpio.Length > 200)
            throw new DominioException("El motivo de la ausencia no puede superar los 200 caracteres.");

        return new Ausencia
        {
            Id = Guid.NewGuid(),
            UsuarioId = usuarioId,
            Desde = desde,
            Hasta = hasta,
            Motivo = limpio,
            CreadoEn = ahoraUtc
        };
    }

    public bool Cubre(DateOnly fecha) => fecha >= Desde && fecha <= Hasta;
}
