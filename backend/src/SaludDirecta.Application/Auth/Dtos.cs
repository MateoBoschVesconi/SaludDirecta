namespace SaludDirecta.Application.Auth;

public sealed record RegistroRequest(
    string Nombre,
    string Email,
    string Telefono,
    string Password,
    string Rol,
    string? Profesion,
    string? Matricula,
    string? Jurisdiccion,
    bool ConsentimientoAceptado);

public sealed record LoginRequest(string Email, string Password);

/// <summary>Los nombres coinciden con el objeto "user" que ya usa el frontend (AuthContext).</summary>
public sealed record UsuarioDto(
    Guid Id,
    string Nombre,
    string Email,
    string Telefono,
    string Rol,
    string? Profesion,
    string? Matricula,
    string? Jurisdiccion,
    DateTime ConsentAcceptedAt);

public sealed record AuthResponse(string Token, DateTime ExpiraEnUtc, UsuarioDto User);
