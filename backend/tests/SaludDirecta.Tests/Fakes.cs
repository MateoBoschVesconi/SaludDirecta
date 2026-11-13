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

/// <summary>Registro oficial falso: devuelve lo que el test le indique, o lanza una excepción.</summary>
internal sealed class RegistroFalso(RespuestaRegistro? respuesta = null, Exception? falla = null)
    : IRegistroProfesionales
{
    public int Consultas { get; private set; }

    public Task<RespuestaRegistro> ConsultarAsync(string matricula, string jurisdiccion, CancellationToken ct)
    {
        Consultas++;
        if (falla is not null) throw falla;
        return Task.FromResult(respuesta ?? new RespuestaRegistro(ResultadoConsulta.NoEncontrada));
    }
}

internal sealed class VerificacionRepositorioEnMemoria : IVerificacionRepository
{
    public List<VerificacionMatricula> Verificaciones { get; } = [];
    public List<EventoAuditoria> Auditoria { get; } = [];

    public Task RegistrarAsync(VerificacionMatricula verificacion, EventoAuditoria evento, CancellationToken ct)
    {
        Verificaciones.Add(verificacion);
        Auditoria.Add(evento);
        return Task.CompletedTask;
    }

    public Task<VerificacionMatricula?> ObtenerUltimaAsync(Guid usuarioId, CancellationToken ct) =>
        Task.FromResult(Verificaciones
            .Where(v => v.UsuarioId == usuarioId)
            .OrderByDescending(v => v.VerificadaEn)
            .FirstOrDefault());
}
