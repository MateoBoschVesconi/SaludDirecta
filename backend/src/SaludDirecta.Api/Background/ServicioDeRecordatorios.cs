using SaludDirecta.Application.Notificaciones;

namespace SaludDirecta.Api.Background;

/// <summary>
/// HU10: cada cierto tiempo envía las notificaciones pendientes cuyo momento ya llegó
/// (los avisos inmediatos y los recordatorios de turnos). Corre dentro de la propia API.
/// </summary>
public sealed class ServicioDeRecordatorios(
    IServiceScopeFactory alcances,
    IConfiguration configuracion,
    ILogger<ServicioDeRecordatorios> registro) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken detener)
    {
        var segundos = configuracion.GetValue("Notificaciones:IntervaloSegundos", 60);
        var intervalo = TimeSpan.FromSeconds(Math.Clamp(segundos, 5, 3600));

        using var temporizador = new PeriodicTimer(intervalo);
        try
        {
            do
            {
                await EnviarPendientesAsync(detener);
            }
            while (await temporizador.WaitForNextTickAsync(detener));
        }
        catch (OperationCanceledException)
        {
            // La API se está apagando.
        }
    }

    private async Task EnviarPendientesAsync(CancellationToken detener)
    {
        try
        {
            // Cada vuelta usa su propio alcance, porque el servicio de notificaciones trabaja con la base de datos.
            using var alcance = alcances.CreateScope();
            var servicio = alcance.ServiceProvider.GetRequiredService<NotificacionService>();
            var enviadas = await servicio.EnviarPendientesAsync(detener);
            if (enviadas > 0) registro.LogInformation("Se enviaron {Cantidad} notificaciones.", enviadas);
        }
        catch (OperationCanceledException) when (detener.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            // Un error en una vuelta no debe frenar el servicio: se reintenta en la siguiente.
            registro.LogError(ex, "Falló el envío de notificaciones pendientes.");
        }
    }
}
