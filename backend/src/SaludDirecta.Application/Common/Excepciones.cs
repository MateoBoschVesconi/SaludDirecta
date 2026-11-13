namespace SaludDirecta.Application.Common;

/// <summary>Datos de entrada inválidos (HTTP 400).</summary>
public class ValidacionException(string mensaje) : Exception(mensaje);

/// <summary>El correo ya está registrado (HTTP 409).</summary>
public class EmailDuplicadoException()
    : Exception("Ya existe una cuenta registrada con ese correo electrónico.");

/// <summary>Credenciales incorrectas o sesión inválida (HTTP 401).</summary>
public class CredencialesInvalidasException(string mensaje = "Correo o contraseña incorrectos.")
    : Exception(mensaje);
