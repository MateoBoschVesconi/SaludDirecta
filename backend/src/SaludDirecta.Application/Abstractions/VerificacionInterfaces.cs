using SaludDirecta.Domain.Entities;

namespace SaludDirecta.Application.Abstractions;

public enum ResultadoConsulta
{
    Encontrada = 1,
    NoEncontrada = 2,
    ServicioNoDisponible = 3
}

/// <summary>Lo que informa el registro oficial sobre una matrícula.</summary>
public sealed record RespuestaRegistro(
    ResultadoConsulta Resultado,
    bool Habilitada = false,
    string? Profesion = null,
    string? Jurisdiccion = null,
    string? Nombre = null,
    string Fuente = "REFEPS");

/// <summary>
/// Puerto (Adapter) hacia el registro oficial de profesionales (REFEPS/SISA).
/// La aplicación solo conoce esta interfaz: se puede cambiar el cliente real
/// por uno simulado sin tocar la lógica de verificación.
/// </summary>
public interface IRegistroProfesionales
{
    Task<RespuestaRegistro> ConsultarAsync(string matricula, string jurisdiccion, CancellationToken ct);
}

public interface IVerificacionRepository
{
    /// <summary>Guarda la verificación y su evento de auditoría en una sola operación.</summary>
    Task RegistrarAsync(VerificacionMatricula verificacion, EventoAuditoria evento, CancellationToken ct);

    Task<VerificacionMatricula?> ObtenerUltimaAsync(Guid usuarioId, CancellationToken ct);
}
