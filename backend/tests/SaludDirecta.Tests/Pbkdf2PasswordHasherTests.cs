using SaludDirecta.Infrastructure.Security;

namespace SaludDirecta.Tests;

public class Pbkdf2PasswordHasherTests
{
    private readonly Pbkdf2PasswordHasher _hasher = new();

    [Fact]
    public void Hash_no_contiene_la_contrasena_en_texto_plano()
    {
        var hash = _hasher.Hash("Password123");

        Assert.DoesNotContain("Password123", hash);
        Assert.StartsWith("PBKDF2$SHA256$", hash);
    }

    [Fact]
    public void Verificar_acepta_la_contrasena_correcta_y_rechaza_otra()
    {
        var hash = _hasher.Hash("Password123");

        Assert.True(_hasher.Verificar("Password123", hash));
        Assert.False(_hasher.Verificar("password123", hash));
    }

    [Fact]
    public void Misma_contrasena_genera_hashes_distintos_por_la_sal()
    {
        Assert.NotEqual(_hasher.Hash("Password123"), _hasher.Hash("Password123"));
    }

    [Theory]
    [InlineData("")]
    [InlineData("texto-cualquiera")]
    [InlineData("PBKDF2$SHA256$abc$xx$yy")]
    [InlineData("PBKDF2$SHA256$1000$no-es-base64!$no-es-base64!")]
    public void Verificar_con_hash_mal_formado_devuelve_false(string hashInvalido)
    {
        Assert.False(_hasher.Verificar("Password123", hashInvalido));
    }
}
