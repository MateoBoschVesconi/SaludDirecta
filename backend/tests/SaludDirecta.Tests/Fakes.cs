using SaludDirecta.Application.Abstractions;
using SaludDirecta.Application.Common;
using SaludDirecta.Domain.Entities;

namespace SaludDirecta.Tests;

internal sealed class RepositorioEnMemoria : IUsuarioRepository
{
    public List<Usuario> Guardados { get; } = [];

    public Task<Usuario?> ObtenerPorIdAsync(Guid id, CancellationToken ct) =>
        Task.FromResult(Guardados.FirstOrDefault(u => u.Id == id));

    public Task<Usuario?> ObtenerPorEmailAsync(string emailNormalizado, CancellationToken ct) =>
        Task.FromResult(Guardados.FirstOrDefault(u => u.Email == emailNormalizado));

    public Task<bool> ExisteEmailAsync(string emailNormalizado, CancellationToken ct) =>
        Task.FromResult(Guardados.Any(u => u.Email == emailNormalizado));

    public Task AgregarAsync(Usuario usuario, CancellationToken ct)
    {
        if (Guardados.Any(u => u.Email == usuario.Email)) throw new EmailDuplicadoException();
        Guardados.Add(usuario);
        return Task.CompletedTask;
    }
}

internal sealed class HasherFalso : IPasswordHasher
{
    public string Hash(string password) => "hash:" + password;
    public bool Verificar(string password, string hash) => hash == "hash:" + password;
}

internal sealed class TokenFalso : ITokenService
{
    public TokenEmitido Emitir(Usuario usuario) =>
        new("token-de-" + usuario.Id, DateTime.UtcNow.AddHours(1));
}
