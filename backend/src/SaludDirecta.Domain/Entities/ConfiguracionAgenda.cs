using SaludDirecta.Domain.Exceptions;

namespace SaludDirecta.Domain.Entities;

/// <summary>Ajustes de la agenda de un profesional: descanso entre sesiones y aviso mínimo para reservar (HU8).</summary>
public sealed class ConfiguracionAgenda
{
    public const int DescansoMaximoMinutos = 120;
    public const int AnticipacionMaximaHoras = 720;

    private ConfiguracionAgenda() { } // Requerido por EF Core

    /// <summary>Es también la clave: cada profesional tiene una sola configuración.</summary>
    public Guid UsuarioId { get; private set; }

    public int DescansoEntreSesionesMinutos { get; private set; }
    public int AnticipacionMinimaHoras { get; private set; }

    public static ConfiguracionAgenda Crear(Guid usuarioId) => new() { UsuarioId = usuarioId };

    public void Actualizar(int descansoMinutos, int anticipacionHoras)
    {
        if (descansoMinutos is < 0 or > DescansoMaximoMinutos)
            throw new DominioException(
                $"El descanso entre sesiones debe estar entre 0 y {DescansoMaximoMinutos} minutos.");
        if (anticipacionHoras is < 0 or > AnticipacionMaximaHoras)
            throw new DominioException(
                $"La anticipación mínima debe estar entre 0 y {AnticipacionMaximaHoras} horas.");

        DescansoEntreSesionesMinutos = descansoMinutos;
        AnticipacionMinimaHoras = anticipacionHoras;
    }
}
