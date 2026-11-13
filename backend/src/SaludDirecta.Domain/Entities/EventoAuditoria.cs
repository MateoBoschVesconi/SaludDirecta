namespace SaludDirecta.Domain.Entities;

/// <summary>
/// Entrada de la bitácora de auditoría. Es solo de inserción: no se modifica ni se borra.
/// La HU14 la extiende con el middleware general; acá la usa la verificación de matrículas.
/// </summary>
public sealed class EventoAuditoria
{
    private EventoAuditoria() { } // Requerido por EF Core

    public Guid Id { get; private set; }

    /// <summary>Usuario que originó el evento (null si no hay usuario asociado).</summary>
    public Guid? UsuarioId { get; private set; }

    public string Accion { get; private set; } = string.Empty;
    public string Detalle { get; private set; } = string.Empty;
    public DateTime CreadoEn { get; private set; }

    public static EventoAuditoria Crear(Guid? usuarioId, string accion, string detalle, DateTime ahoraUtc) => new()
    {
        Id = Guid.NewGuid(),
        UsuarioId = usuarioId,
        Accion = accion,
        Detalle = detalle,
        CreadoEn = ahoraUtc
    };
}
