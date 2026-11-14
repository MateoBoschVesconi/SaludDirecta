using SaludDirecta.Domain.Exceptions;

namespace SaludDirecta.Domain.Entities;

public enum TipoNotificacion
{
    TurnoSolicitado = 1,
    TurnoConfirmado = 2,
    TurnoCancelado = 3,
    Recordatorio = 4
}

public enum EstadoNotificacion
{
    /// <summary>Esperando su momento de envío (o el próximo ciclo del servicio de envíos).</summary>
    Pendiente = 1,
    Enviada = 2,
    /// <summary>Ya no corresponde enviarla (por ejemplo, se canceló el turno del recordatorio).</summary>
    Cancelada = 3,
    /// <summary>Se agotaron los reintentos de envío.</summary>
    Fallida = 4
}

/// <summary>
/// Aviso para un usuario sobre un turno (HU10). Sirve tanto de bandeja dentro de la aplicación como de
/// cola de envío: el servicio de recordatorios manda las pendientes cuyo momento ya llegó.
/// </summary>
public sealed class Notificacion
{
    public const int MaximoIntentos = 3;

    private Notificacion() { } // Requerido por EF Core

    public Guid Id { get; private set; }
    public Guid UsuarioId { get; private set; }
    public Guid TurnoId { get; private set; }
    public TipoNotificacion Tipo { get; private set; }
    public string Asunto { get; private set; } = string.Empty;
    public string Mensaje { get; private set; } = string.Empty;
    public EstadoNotificacion Estado { get; private set; }

    /// <summary>Momento (UTC) a partir del cual se puede enviar.</summary>
    public DateTime ProgramadaPara { get; private set; }

    public int Intentos { get; private set; }
    public DateTime? EnviadaEn { get; private set; }
    public DateTime? LeidaEn { get; private set; }
    public DateTime CreadoEn { get; private set; }

    public static Notificacion Crear(
        Guid usuarioId, Guid turnoId, TipoNotificacion tipo, string asunto, string mensaje,
        DateTime programadaParaUtc, DateTime ahoraUtc)
    {
        var asuntoLimpio = asunto?.Trim();
        var mensajeLimpio = mensaje?.Trim();
        if (string.IsNullOrEmpty(asuntoLimpio) || asuntoLimpio.Length > 150)
            throw new DominioException("El asunto de la notificación es obligatorio y no puede superar los 150 caracteres.");
        if (string.IsNullOrEmpty(mensajeLimpio) || mensajeLimpio.Length > 1000)
            throw new DominioException("El mensaje de la notificación es obligatorio y no puede superar los 1000 caracteres.");

        return new Notificacion
        {
            Id = Guid.NewGuid(),
            UsuarioId = usuarioId,
            TurnoId = turnoId,
            Tipo = tipo,
            Asunto = asuntoLimpio,
            Mensaje = mensajeLimpio,
            Estado = EstadoNotificacion.Pendiente,
            ProgramadaPara = programadaParaUtc,
            CreadoEn = ahoraUtc
        };
    }

    public bool DebeEnviarse(DateTime ahoraUtc) =>
        Estado == EstadoNotificacion.Pendiente && ProgramadaPara <= ahoraUtc;

    public void RegistrarEnvio(DateTime ahoraUtc)
    {
        if (Estado != EstadoNotificacion.Pendiente) return;
        Estado = EstadoNotificacion.Enviada;
        EnviadaEn = ahoraUtc;
    }

    /// <summary>Cuenta un intento fallido; al llegar al máximo deja de reintentar.</summary>
    public void RegistrarFallo()
    {
        if (Estado != EstadoNotificacion.Pendiente) return;
        Intentos++;
        if (Intentos >= MaximoIntentos) Estado = EstadoNotificacion.Fallida;
    }

    /// <summary>Solo se cancelan las que todavía no salieron.</summary>
    public void Cancelar()
    {
        if (Estado == EstadoNotificacion.Pendiente) Estado = EstadoNotificacion.Cancelada;
    }

    public void MarcarLeida(DateTime ahoraUtc) => LeidaEn ??= ahoraUtc;
}
