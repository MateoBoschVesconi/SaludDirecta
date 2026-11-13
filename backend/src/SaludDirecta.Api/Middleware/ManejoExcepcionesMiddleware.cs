using Microsoft.AspNetCore.Mvc;
using SaludDirecta.Application.Common;

namespace SaludDirecta.Api.Middleware;

/// <summary>Traduce las excepciones de la aplicación a respuestas HTTP (ProblemDetails).</summary>
public sealed class ManejoExcepcionesMiddleware(RequestDelegate siguiente, ILogger<ManejoExcepcionesMiddleware> log)
{
    public async Task InvokeAsync(HttpContext contexto)
    {
        try
        {
            await siguiente(contexto);
        }
        catch (ValidacionException ex)
        {
            await Responder(contexto, StatusCodes.Status400BadRequest, "Datos inválidos", ex.Message);
        }
        catch (CredencialesInvalidasException ex)
        {
            await Responder(contexto, StatusCodes.Status401Unauthorized, "No autorizado", ex.Message);
        }
        catch (EmailDuplicadoException ex)
        {
            await Responder(contexto, StatusCodes.Status409Conflict, "Conflicto", ex.Message);
        }
        catch (Exception ex)
        {
            log.LogError(ex, "Error no controlado en {Metodo} {Ruta}", contexto.Request.Method, contexto.Request.Path);
            await Responder(contexto, StatusCodes.Status500InternalServerError,
                "Error interno", "Ocurrió un error inesperado.");
        }
    }

    private static Task Responder(HttpContext contexto, int estado, string titulo, string detalle)
    {
        contexto.Response.StatusCode = estado;
        return contexto.Response.WriteAsJsonAsync(new ProblemDetails
        {
            Status = estado,
            Title = titulo,
            Detail = detalle
        });
    }
}
