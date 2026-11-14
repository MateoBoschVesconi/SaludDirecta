namespace SaludDirecta.Domain.Entities;

/// <summary>Estados del turno (RF-11). Se guardan en minúsculas: solicitado, confirmado, cumplido, cancelado y ausente.</summary>
public enum EstadoTurno
{
    Solicitado = 1,
    Confirmado = 2,
    Cumplido = 3,
    Cancelado = 4,
    Ausente = 5
}
