using SaludDirecta.Domain.Exceptions;

namespace SaludDirecta.Domain.Entities;

/// <summary>
/// Prestación que ofrece un profesional (por ejemplo "Primera consulta" o "Sesión de rehabilitación"),
/// con su duración. La baja es lógica para no romper turnos futuros que la referencien.
/// </summary>
public sealed class Prestacion
{
    public const int DuracionMinima = 5;
    public const int DuracionMaxima = 480;

    private Prestacion() { } // Requerido por EF Core

    public Guid Id { get; private set; }
    public Guid UsuarioId { get; private set; }
    public string Nombre { get; private set; } = string.Empty;
    public int DuracionMinutos { get; private set; }
    public bool Activa { get; private set; }
    public DateTime CreadoEn { get; private set; }

    public static Prestacion Crear(Guid usuarioId, string? nombre, int duracionMinutos, DateTime ahoraUtc)
    {
        var prestacion = new Prestacion
        {
            Id = Guid.NewGuid(),
            UsuarioId = usuarioId,
            Activa = true,
            CreadoEn = ahoraUtc
        };
        prestacion.Modificar(nombre, duracionMinutos);
        return prestacion;
    }

    public void Modificar(string? nombre, int duracionMinutos)
    {
        var limpio = nombre?.Trim();
        if (string.IsNullOrEmpty(limpio))
            throw new DominioException("El nombre de la prestación es obligatorio.");
        if (limpio.Length > 120)
            throw new DominioException("El nombre de la prestación no puede superar los 120 caracteres.");
        if (duracionMinutos is < DuracionMinima or > DuracionMaxima)
            throw new DominioException(
                $"La duración de la prestación debe estar entre {DuracionMinima} y {DuracionMaxima} minutos.");

        Nombre = limpio;
        DuracionMinutos = duracionMinutos;
    }

    public void DarDeBaja() => Activa = false;
}
