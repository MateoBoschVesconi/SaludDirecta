using System.Security.Cryptography;
using SaludDirecta.Application.Abstractions;

namespace SaludDirecta.Infrastructure.Security;

/// <summary>
/// Hash de contraseñas con PBKDF2-HMAC-SHA256 y sal aleatoria.
/// Formato guardado: PBKDF2$SHA256$iteraciones$sal(base64)$hash(base64)
/// </summary>
public sealed class Pbkdf2PasswordHasher : IPasswordHasher
{
    private const string Prefijo = "PBKDF2";
    private const int Iteraciones = 600_000; // recomendación OWASP para PBKDF2-HMAC-SHA256
    private const int BytesSal = 16;
    private const int BytesHash = 32;

    public string Hash(string password)
    {
        var sal = RandomNumberGenerator.GetBytes(BytesSal);
        var hash = Rfc2898DeriveBytes.Pbkdf2(password, sal, Iteraciones, HashAlgorithmName.SHA256, BytesHash);
        return $"{Prefijo}$SHA256${Iteraciones}${Convert.ToBase64String(sal)}${Convert.ToBase64String(hash)}";
    }

    public bool Verificar(string password, string hash)
    {
        var partes = hash.Split('$');
        if (partes.Length != 5 || partes[0] != Prefijo || partes[1] != "SHA256") return false;
        if (!int.TryParse(partes[2], out var iteraciones) || iteraciones <= 0) return false;

        try
        {
            var sal = Convert.FromBase64String(partes[3]);
            var esperado = Convert.FromBase64String(partes[4]);
            var calculado = Rfc2898DeriveBytes.Pbkdf2(
                password, sal, iteraciones, HashAlgorithmName.SHA256, esperado.Length);
            return CryptographicOperations.FixedTimeEquals(calculado, esperado);
        }
        catch (FormatException)
        {
            return false;
        }
    }
}
