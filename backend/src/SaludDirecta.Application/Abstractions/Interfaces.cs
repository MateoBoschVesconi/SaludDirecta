using SaludDirecta.Domain.Entities;

namespace SaludDirecta.Application.Abstractions;

public interface IUsuarioRepository
{
    Task<Usuario?> ObtenerPorIdAsync(Guid id, CancellationToken ct);
    Task<Usuario?> ObtenerPorEmailAsync(string emailNormalizado, CancellationToken ct);
    Task<bool> ExisteEmailAsync(string emailNormalizado, CancellationToken ct);

    /// <exception cref="Common.EmailDuplicadoException">Si el correo ya existe.</exception>
    Task AgregarAsync(Usuario usuario, CancellationToken ct);
}

public interface IPasswordHasher
{
    string Hash(string password);
    bool Verificar(string password, string hash);
}

public sealed record TokenEmitido(string Token, DateTime ExpiraEnUtc);

public interface ITokenService
{
    TokenEmitido Emitir(Usuario usuario);
}
