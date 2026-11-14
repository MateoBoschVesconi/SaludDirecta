using SaludDirecta.Domain.Exceptions;

namespace SaludDirecta.Application.Common;

/// <summary>
/// Ejecuta una regla del dominio y, si la viola, la convierte en un error de validación (HTTP 400),
/// igual que hace AuthService con el registro.
/// </summary>
internal static class ReglasDominio
{
    public static void Ejecutar(Action regla)
    {
        try { regla(); }
        catch (DominioException ex) { throw new ValidacionException(ex.Message); }
    }

    public static T Ejecutar<T>(Func<T> regla)
    {
        try { return regla(); }
        catch (DominioException ex) { throw new ValidacionException(ex.Message); }
    }
}
