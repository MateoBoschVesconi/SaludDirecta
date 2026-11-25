namespace SaludDirecta.Api.Middleware;

/// <summary>
/// Cabeceras de seguridad en todas las respuestas (RNF-03). Las respuestas de la API no se guardan
/// en caché, porque contienen datos personales.
/// </summary>
public sealed class CabecerasSeguridadMiddleware(RequestDelegate siguiente)
{
    public Task InvokeAsync(HttpContext contexto)
    {
        contexto.Response.OnStarting(() =>
        {
            var cabeceras = contexto.Response.Headers;
            cabeceras["X-Content-Type-Options"] = "nosniff";
            cabeceras["X-Frame-Options"] = "DENY";
            cabeceras["Referrer-Policy"] = "no-referrer";

            if (contexto.Request.Path.StartsWithSegments("/api"))
            {
                cabeceras["Cache-Control"] = "no-store";
                cabeceras["Pragma"] = "no-cache";
            }

            return Task.CompletedTask;
        });

        return siguiente(contexto);
    }
}
