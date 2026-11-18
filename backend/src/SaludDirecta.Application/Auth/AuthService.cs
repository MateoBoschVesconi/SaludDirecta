using SaludDirecta.Application.Abstractions;
using SaludDirecta.Application.Common;
using SaludDirecta.Domain.Entities;
using SaludDirecta.Domain.Exceptions;

namespace SaludDirecta.Application.Auth;

/// <summary>Casos de uso de HU1: registro, inicio de sesión y perfil.</summary>
public sealed class AuthService(
    IUsuarioRepository usuarios,
    IPasswordHasher hasher,
    ITokenService tokens,
    TimeProvider reloj)
{
    public const int LargoMinimoPassword = 8;

    public async Task<AuthResponse> RegistrarAsync(RegistroRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < LargoMinimoPassword)
            throw new ValidacionException(
                $"La contraseña debe tener al menos {LargoMinimoPassword} caracteres.");

        var rol = ParsearRol(request.Rol);
        var email = Usuario.NormalizarEmail(request.Email);

        if (await usuarios.ExisteEmailAsync(email, ct))
            throw new EmailDuplicadoException();

        Usuario usuario;
        try
        {
            usuario = Usuario.Crear(
                request.Nombre,
                request.Email,
                request.Telefono,
                hasher.Hash(request.Password),
                rol,
                request.Profesion,
                request.Matricula,
                request.Jurisdiccion,
                request.ConsentimientoAceptado,
                reloj.GetUtcNow().UtcDateTime);
        }
        catch (DominioException ex)
        {
            throw new ValidacionException(ex.Message);
        }

        await usuarios.AgregarAsync(usuario, ct);
        return Responder(usuario);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken ct = default)
    {
        var usuario = await usuarios.ObtenerPorEmailAsync(Usuario.NormalizarEmail(request.Email), ct);

        // Mismo mensaje si el correo no existe o la contraseña falla: no revela qué cuentas existen.
        if (usuario is null || !hasher.Verificar(request.Password ?? string.Empty, usuario.PasswordHash))
            throw new CredencialesInvalidasException();

        return Responder(usuario);
    }

    public async Task<UsuarioDto> ObtenerPerfilAsync(Guid usuarioId, CancellationToken ct = default)
    {
        var usuario = await usuarios.ObtenerPorIdAsync(usuarioId, ct)
            ?? throw new CredencialesInvalidasException("La sesión no es válida.");
        return ADto(usuario);
    }

    private AuthResponse Responder(Usuario usuario)
    {
        var emitido = tokens.Emitir(usuario);
        return new AuthResponse(emitido.Token, emitido.ExpiraEnUtc, ADto(usuario));
    }

    private static UsuarioDto ADto(Usuario u) => new(
        u.Id, u.Nombre, u.Email, u.Telefono,
        u.Rol.ToString().ToLowerInvariant(),
        u.Profesion, u.Matricula, u.Jurisdiccion,
        u.ConsentimientoAceptadoEn);

    private static Rol ParsearRol(string? rol) => rol?.Trim().ToLowerInvariant() switch
    {
        "paciente" => Rol.Paciente,
        "profesional" => Rol.Profesional,
        _ => throw new ValidacionException("El rol debe ser 'paciente' o 'profesional'.")
    };
}
