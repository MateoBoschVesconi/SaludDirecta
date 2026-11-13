using System.Net.Mail;
using SaludDirecta.Domain.Exceptions;

namespace SaludDirecta.Domain.Entities;

/// <summary>
/// Usuario de la plataforma (paciente o profesional).
/// Solo guarda datos administrativos: no almacena datos clínicos (RNF-02).
/// </summary>
public sealed class Usuario
{
    private Usuario() { } // Requerido por EF Core

    public Guid Id { get; private set; }
    public string Nombre { get; private set; } = string.Empty;
    public string Email { get; private set; } = string.Empty;
    public string Telefono { get; private set; } = string.Empty;
    public string PasswordHash { get; private set; } = string.Empty;
    public Rol Rol { get; private set; }

    // Solo para profesionales
    public string? Profesion { get; private set; }
    public string? Matricula { get; private set; }
    public string? Jurisdiccion { get; private set; }

    /// <summary>Momento en que aceptó el consentimiento informado (Ley 25.326).</summary>
    public DateTime ConsentimientoAceptadoEn { get; private set; }
    public DateTime CreadoEn { get; private set; }

    public static string NormalizarEmail(string? email) =>
        (email ?? string.Empty).Trim().ToLowerInvariant();

    public static Usuario Crear(
        string? nombre,
        string? email,
        string? telefono,
        string passwordHash,
        Rol rol,
        string? profesion,
        string? matricula,
        string? jurisdiccion,
        bool consentimientoAceptado,
        DateTime ahoraUtc)
    {
        if (!consentimientoAceptado)
            throw new DominioException(
                "Debe aceptar el consentimiento informado para el tratamiento de datos personales (Ley 25.326).");

        if (string.IsNullOrWhiteSpace(nombre))
            throw new DominioException("El nombre es obligatorio.");

        var emailNormalizado = NormalizarEmail(email);
        if (!EsEmailValido(emailNormalizado))
            throw new DominioException("El correo electrónico no es válido.");

        if (string.IsNullOrWhiteSpace(telefono))
            throw new DominioException("El teléfono es obligatorio.");

        if (string.IsNullOrWhiteSpace(passwordHash))
            throw new DominioException("La contraseña es obligatoria.");

        if (rol == Rol.Profesional)
        {
            if (string.IsNullOrWhiteSpace(profesion))
                throw new DominioException("La profesión es obligatoria para profesionales.");
            if (string.IsNullOrWhiteSpace(matricula))
                throw new DominioException("La matrícula es obligatoria para profesionales.");
            if (string.IsNullOrWhiteSpace(jurisdiccion))
                throw new DominioException("La jurisdicción es obligatoria para profesionales.");
        }
        else
        {
            profesion = matricula = jurisdiccion = null;
        }

        return new Usuario
        {
            Id = Guid.NewGuid(),
            Nombre = nombre.Trim(),
            Email = emailNormalizado,
            Telefono = telefono.Trim(),
            PasswordHash = passwordHash,
            Rol = rol,
            Profesion = profesion?.Trim(),
            Matricula = matricula?.Trim(),
            Jurisdiccion = jurisdiccion?.Trim(),
            ConsentimientoAceptadoEn = ahoraUtc,
            CreadoEn = ahoraUtc
        };
    }

    private static bool EsEmailValido(string email) =>
        MailAddress.TryCreate(email, out var direccion) && direccion.Address == email;
}
