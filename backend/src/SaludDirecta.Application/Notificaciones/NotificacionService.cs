using SaludDirecta.Application.Abstractions;
using SaludDirecta.Application.Common;
using SaludDirecta.Domain.Entities;

namespace SaludDirecta.Application.Notificaciones;

/// <summary>HU10: bandeja de notificaciones del usuario y envío de las que están pendientes.</summary>
public sealed class NotificacionService(
    INotificacionRepository notificaciones,
    IUsuarioRepository usuarios,
    IEnviadorNotificaciones enviador,
    TimeProvider reloj)
{
    public const int MaximoPorTanda = 50;
    private const int MaximoEnBandeja = 100;

    // ---------- Bandeja del usuario ----------

    public async Task<IReadOnlyList<NotificacionDto>> ListarMisNotificacionesAsync(
        Guid usuarioId, CancellationToken ct = default)
    {
        var lista = await notificaciones.ListarDeUsuarioAsync(usuarioId, MaximoEnBandeja, ct);
        return lista.Select(ADto).ToList();
    }

    public async Task<NotificacionDto> MarcarLeidaAsync(Guid usuarioId, Guid notificacionId, CancellationToken ct = default)
    {
        var notificacion = await notificaciones.ObtenerAsync(notificacionId, ct);

        // Si es de otra persona se responde "no existe", para no revelar que existe.
        if (notificacion is null || notificacion.UsuarioId != usuarioId)
            throw new NoEncontradoException("La notificación no existe.");

        notificacion.MarcarLeida(reloj.GetUtcNow().UtcDateTime);
        await notificaciones.GuardarCambiosAsync(ct);
        return ADto(notificacion);
    }

    // ---------- Envío (lo llama el servicio en segundo plano) ----------

    /// <summary>
    /// Envía las notificaciones pendientes cuyo momento ya llegó. Si una falla no frena a las demás:
    /// queda pendiente y se reintenta en la próxima vuelta, hasta <see cref="Notificacion.MaximoIntentos"/> veces.
    /// Devuelve cuántas se enviaron.
    /// </summary>
    public async Task<int> EnviarPendientesAsync(CancellationToken ct = default)
    {
        var ahora = reloj.GetUtcNow().UtcDateTime;
        var pendientes = await notificaciones.ListarPorEnviarAsync(ahora, MaximoPorTanda, ct);
        var enviadas = 0;

        foreach (var notificacion in pendientes)
        {
            try
            {
                var destinatario = await usuarios.ObtenerPorIdAsync(notificacion.UsuarioId, ct);
                if (destinatario is null)
                {
                    notificacion.Cancelar(); // el usuario ya no existe
                    continue;
                }

                await enviador.EnviarAsync(notificacion, destinatario, ct);
                notificacion.RegistrarEnvio(ahora);
                enviadas++;
            }
            catch (OperationCanceledException)
            {
                throw;
            }
            catch (Exception)
            {
                notificacion.RegistrarFallo();
            }
        }

        if (pendientes.Count > 0) await notificaciones.GuardarCambiosAsync(ct);
        return enviadas;
    }

    private static NotificacionDto ADto(Notificacion n) => new(
        n.Id, n.TurnoId,
        NombreDelTipo(n.Tipo),
        n.Asunto, n.Mensaje,
        n.Estado.ToString().ToLowerInvariant(),
        n.LeidaEn is not null,
        n.ProgramadaPara, n.EnviadaEn, n.CreadoEn);

    private static string NombreDelTipo(TipoNotificacion tipo) => tipo switch
    {
        TipoNotificacion.TurnoSolicitado => "turno_solicitado",
        TipoNotificacion.TurnoConfirmado => "turno_confirmado",
        TipoNotificacion.TurnoCancelado => "turno_cancelado",
        _ => "recordatorio"
    };
}
