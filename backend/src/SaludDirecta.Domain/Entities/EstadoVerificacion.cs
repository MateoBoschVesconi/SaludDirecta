namespace SaludDirecta.Domain.Entities;

/// <summary>Resultado de verificar una matrícula contra el registro oficial.</summary>
public enum EstadoVerificacion
{
    /// <summary>Habilitada y con profesión y jurisdicción coincidentes: recibe el distintivo.</summary>
    Verificada = 1,

    /// <summary>No se pudo resolver automáticamente: la revisa una persona.</summary>
    RevisionManual = 2,

    /// <summary>El registro oficial la informa como no habilitada.</summary>
    Rechazada = 3
}
