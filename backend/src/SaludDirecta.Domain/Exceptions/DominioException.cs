namespace SaludDirecta.Domain.Exceptions;

/// <summary>Se lanza cuando se viola una regla de negocio del dominio.</summary>
public class DominioException(string mensaje) : Exception(mensaje);
