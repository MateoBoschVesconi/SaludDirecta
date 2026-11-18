namespace SaludDirecta.Domain.Entities;

/// <summary>
/// Una verificación de matrícula. Cada intento genera un registro nuevo,
/// así queda el historial (RF-02: "registrar el resultado de la verificación").
/// </summary>
public sealed class VerificacionMatricula
{
    private VerificacionMatricula() { } // Requerido por EF Core

    public Guid Id { get; private set; }
    public Guid UsuarioId { get; private set; }

    // Datos declarados por el profesional al momento de verificar
    public string Profesion { get; private set; } = string.Empty;
    public string Matricula { get; private set; } = string.Empty;
    public string Jurisdiccion { get; private set; } = string.Empty;

    public EstadoVerificacion Estado { get; private set; }
    public string Motivo { get; private set; } = string.Empty;

    /// <summary>Origen de la respuesta: "REFEPS" o "SIMULADO".</summary>
    public string Fuente { get; private set; } = string.Empty;

    public DateTime VerificadaEn { get; private set; }

    /// <summary>Solo una verificación exitosa otorga el distintivo (RF-04).</summary>
    public bool OtorgaDistintivo => Estado == EstadoVerificacion.Verificada;

    public static VerificacionMatricula Crear(
        Guid usuarioId,
        string profesion,
        string matricula,
        string jurisdiccion,
        EstadoVerificacion estado,
        string motivo,
        string fuente,
        DateTime ahoraUtc) => new()
    {
        Id = Guid.NewGuid(),
        UsuarioId = usuarioId,
        Profesion = profesion,
        Matricula = matricula,
        Jurisdiccion = jurisdiccion,
        Estado = estado,
        Motivo = motivo,
        Fuente = fuente,
        VerificadaEn = ahoraUtc
    };
}
