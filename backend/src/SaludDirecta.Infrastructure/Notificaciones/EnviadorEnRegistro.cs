using Microsoft.Extensions.Logging;
using SaludDirecta.Application.Abstractions;
using SaludDirecta.Domain.Entities;

namespace SaludDirecta.Infrastructure.Notificaciones;

/// <summary>
/// Canal de envío simulado para desarrollo y pruebas: en lugar de mandar un mail o un mensaje,
/// deja constancia del aviso en el registro del sistema (la consola de la API).
/// Para enviar de verdad se escribe otra clase que implemente <see cref="IEnviadorNotificaciones"/>
/// (por ejemplo, una por SMTP) y se registra en DependencyInjection en lugar de esta.
/// </summary>
public sealed class EnviadorEnRegistro(ILogger<EnviadorEnRegistro> registro) : IEnviadorNotificaciones
{
    public Task EnviarAsync(Notificacion notificacion, Usuario destinatario, CancellationToken ct)
    {
        registro.LogInformation(
            "Notificación simulada. Para: {Destinatario} <{Email}>. Asunto: {Asunto}. Mensaje: {Mensaje}",
            destinatario.Nombre, destinatario.Email, notificacion.Asunto, notificacion.Mensaje);
        return Task.CompletedTask;
    }
}
