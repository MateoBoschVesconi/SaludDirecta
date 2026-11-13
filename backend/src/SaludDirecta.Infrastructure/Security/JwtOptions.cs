using System.Text;

namespace SaludDirecta.Infrastructure.Security;

public sealed class JwtOptions
{
    public const string Seccion = "Jwt";

    public string Issuer { get; set; } = string.Empty;
    public string Audience { get; set; } = string.Empty;
    public string Key { get; set; } = string.Empty;
    public int ExpirationMinutes { get; set; } = 120;

    public void Validar()
    {
        if (Encoding.UTF8.GetByteCount(Key) < 32)
            throw new InvalidOperationException(
                "Jwt:Key debe tener al menos 32 caracteres. Configurala con user-secrets " +
                "(dotnet user-secrets set \"Jwt:Key\" \"...\") o con la variable de entorno Jwt__Key.");
        if (string.IsNullOrWhiteSpace(Issuer) || string.IsNullOrWhiteSpace(Audience))
            throw new InvalidOperationException("Jwt:Issuer y Jwt:Audience son obligatorios.");
        if (ExpirationMinutes <= 0)
            throw new InvalidOperationException("Jwt:ExpirationMinutes debe ser mayor a cero.");
    }
}
