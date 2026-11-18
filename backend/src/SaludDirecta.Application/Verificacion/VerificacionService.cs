using SaludDirecta.Application.Abstractions;
using SaludDirecta.Application.Common;
using SaludDirecta.Domain.Entities;

namespace SaludDirecta.Application.Verificacion;

/// <summary>Casos de uso de HU2: verificar la matrícula y consultar el distintivo.</summary>
public sealed class VerificacionService(
    IUsuarioRepository usuarios,
    IVerificacionRepository verificaciones,
    CadenaVerificacion cadena,
    TimeProvider reloj)
{
    public const string AccionAuditoria = "VERIFICACION_MATRICULA";

    /// <summary>Verifica la matrícula que el profesional declaró al registrarse.</summary>
    public async Task<VerificacionDto> VerificarAsync(Guid usuarioId, CancellationToken ct = default)
    {
        var usuario = await usuarios.ObtenerPorIdAsync(usuarioId, ct)
            ?? throw new CredencialesInvalidasException("La sesión no es válida.");

        if (usuario.Rol != Rol.Profesional)
            throw new ValidacionException("Solo los profesionales pueden verificar una matrícula.");

        var profesion = usuario.Profesion ?? string.Empty;
        var matricula = usuario.Matricula ?? string.Empty;
        var jurisdiccion = usuario.Jurisdiccion ?? string.Empty;

        if (Texto.NormalizarMatricula(matricula).Length == 0 ||
            string.IsNullOrWhiteSpace(profesion) ||
            string.IsNullOrWhiteSpace(jurisdiccion))
            throw new ValidacionException("Faltan datos de la matrícula (número, jurisdicción o profesión).");

        var resultado = await cadena.EjecutarAsync(new ContextoVerificacion(profesion, matricula, jurisdiccion), ct);

        var ahora = reloj.GetUtcNow().UtcDateTime;
        var verificacion = VerificacionMatricula.Crear(
            usuario.Id, profesion, matricula, jurisdiccion,
            resultado.Estado, resultado.Motivo, resultado.Fuente, ahora);

        // Criterio 4 de la HU2: cada verificación queda en la bitácora de auditoría.
        var evento = EventoAuditoria.Crear(
            usuario.Id,
            AccionAuditoria,
            $"Resultado: {NombreEstado(resultado.Estado)}. Matrícula {matricula} ({jurisdiccion}). {resultado.Motivo}",
            ahora);

        await verificaciones.RegistrarAsync(verificacion, evento, ct);
        return ADto(verificacion);
    }

    /// <summary>Última verificación del profesional (o "sin_verificar" si nunca pidió una).</summary>
    public async Task<VerificacionDto> ObtenerEstadoAsync(Guid usuarioId, CancellationToken ct = default)
    {
        var ultima = await verificaciones.ObtenerUltimaAsync(usuarioId, ct);
        return ultima is null
            ? new VerificacionDto("sin_verificar", false, "Todavía no se solicitó la verificación.", null, null)
            : ADto(ultima);
    }

    /// <summary>Dato público: ¿este profesional tiene el distintivo?</summary>
    public async Task<DistintivoDto> ObtenerDistintivoAsync(Guid profesionalId, CancellationToken ct = default)
    {
        var ultima = await verificaciones.ObtenerUltimaAsync(profesionalId, ct);
        return ultima is { OtorgaDistintivo: true }
            ? new DistintivoDto(true, ultima.VerificadaEn)
            : new DistintivoDto(false, null);
    }

    private static VerificacionDto ADto(VerificacionMatricula v) =>
        new(NombreEstado(v.Estado), v.OtorgaDistintivo, v.Motivo, v.Fuente, v.VerificadaEn);

    private static string NombreEstado(EstadoVerificacion estado) => estado switch
    {
        EstadoVerificacion.Verificada => "verificada",
        EstadoVerificacion.RevisionManual => "revision_manual",
        _ => "rechazada"
    };
}
