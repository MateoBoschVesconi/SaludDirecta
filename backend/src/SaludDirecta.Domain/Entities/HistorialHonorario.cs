namespace SaludDirecta.Domain.Entities;

/// <summary>
/// Una modificación del honorario de la consulta. Es solo de inserción:
/// guarda el valor anterior y el nuevo (criterio 2 de la HU4).
/// </summary>
public sealed class HistorialHonorario
{
    private HistorialHonorario() { } // Requerido por EF Core

    public Guid Id { get; private set; }
    public Guid UsuarioId { get; private set; }

    /// <summary>Null la primera vez que se fija el honorario.</summary>
    public decimal? ValorAnterior { get; private set; }

    public decimal ValorNuevo { get; private set; }
    public DateTime CambiadoEn { get; private set; }

    public static HistorialHonorario Crear(Guid usuarioId, decimal? valorAnterior, decimal valorNuevo, DateTime ahoraUtc) => new()
    {
        Id = Guid.NewGuid(),
        UsuarioId = usuarioId,
        ValorAnterior = valorAnterior,
        ValorNuevo = valorNuevo,
        CambiadoEn = ahoraUtc
    };
}
