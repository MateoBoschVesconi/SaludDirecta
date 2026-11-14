using SaludDirecta.Domain.Exceptions;

namespace SaludDirecta.Domain.Entities;

/// <summary>
/// Perfil público de un profesional: datos del consultorio, honorario de la consulta y estado de publicación (HU4).
/// Hay un solo perfil por profesional. Solo guarda datos administrativos (RNF-02).
/// </summary>
public sealed class PerfilProfesional
{
    public const decimal HonorarioMaximo = 10_000_000m;
    public const int DuracionMinima = 5;
    public const int DuracionMaxima = 240;
    public const int DuracionPorDefecto = 30;

    private PerfilProfesional() { } // Requerido por EF Core

    public Guid Id { get; private set; }

    /// <summary>El profesional dueño del perfil (relación 1 a 1 con <see cref="Usuario"/>).</summary>
    public Guid UsuarioId { get; private set; }

    public string? Especialidad { get; private set; }
    public string? Descripcion { get; private set; }
    public string? Direccion { get; private set; }
    public string? Ciudad { get; private set; }
    public string? Telefono { get; private set; }

    /// <summary>Valor de la consulta. Es obligatorio para poder publicar el perfil (RF-05).</summary>
    public decimal? HonorarioConsulta { get; private set; }

    public int DuracionSesionMinutos { get; private set; } = DuracionPorDefecto;

    // Accesibilidad del consultorio (filtro del buscador, RF-07)
    public bool TieneRampa { get; private set; }
    public bool TieneAscensor { get; private set; }
    public bool TieneBanoAdaptado { get; private set; }

    public bool Publicado { get; private set; }
    public DateTime ActualizadoEn { get; private set; }

    /// <summary>Perfil nuevo: vacío, sin honorario y sin publicar.</summary>
    public static PerfilProfesional Crear(Guid usuarioId, DateTime ahoraUtc) => new()
    {
        Id = Guid.NewGuid(),
        UsuarioId = usuarioId,
        ActualizadoEn = ahoraUtc
    };

    /// <summary>Actualiza los datos descriptivos y del consultorio. No toca el honorario ni la publicación.</summary>
    public void ActualizarDatos(
        string? especialidad,
        string? descripcion,
        string? direccion,
        string? ciudad,
        string? telefono,
        int duracionSesionMinutos,
        bool tieneRampa,
        bool tieneAscensor,
        bool tieneBanoAdaptado,
        DateTime ahoraUtc)
    {
        if (duracionSesionMinutos is < DuracionMinima or > DuracionMaxima)
            throw new DominioException(
                $"La duración de la sesión debe estar entre {DuracionMinima} y {DuracionMaxima} minutos.");

        Especialidad = Limpiar(especialidad, 100, "La especialidad");
        Descripcion = Limpiar(descripcion, 1000, "La descripción");
        Direccion = Limpiar(direccion, 200, "La dirección");
        Ciudad = Limpiar(ciudad, 100, "La ciudad");
        Telefono = Limpiar(telefono, 40, "El teléfono");
        DuracionSesionMinutos = duracionSesionMinutos;
        TieneRampa = tieneRampa;
        TieneAscensor = tieneAscensor;
        TieneBanoAdaptado = tieneBanoAdaptado;
        ActualizadoEn = ahoraUtc;
    }

    /// <summary>
    /// Fija el honorario de la consulta. Devuelve false si el valor es el mismo que ya tenía
    /// (en ese caso no hay cambio que registrar en el historial).
    /// </summary>
    public bool CambiarHonorario(decimal nuevo, DateTime ahoraUtc)
    {
        if (nuevo <= 0)
            throw new DominioException("El honorario de la consulta debe ser mayor a cero.");
        if (nuevo > HonorarioMaximo)
            throw new DominioException("El honorario de la consulta supera el máximo permitido.");

        nuevo = decimal.Round(nuevo, 2);
        if (HonorarioConsulta == nuevo) return false;

        HonorarioConsulta = nuevo;
        ActualizadoEn = ahoraUtc;
        return true;
    }

    /// <summary>Criterio 1 de la HU4: no se puede publicar un perfil sin el valor de la consulta.</summary>
    public void Publicar(DateTime ahoraUtc)
    {
        if (HonorarioConsulta is null or <= 0)
            throw new DominioException("No se puede publicar el perfil sin el valor de la consulta.");

        Publicado = true;
        ActualizadoEn = ahoraUtc;
    }

    public void Despublicar(DateTime ahoraUtc)
    {
        Publicado = false;
        ActualizadoEn = ahoraUtc;
    }

    private static string? Limpiar(string? valor, int maximo, string campo)
    {
        var limpio = valor?.Trim();
        if (string.IsNullOrEmpty(limpio)) return null;
        if (limpio.Length > maximo)
            throw new DominioException($"{campo} no puede superar los {maximo} caracteres.");
        return limpio;
    }
}
