using SaludDirecta.Application.Abstractions;
using SaludDirecta.Application.Common;
using SaludDirecta.Domain.Entities;

namespace SaludDirecta.Application.Verificacion;

/// <summary>Datos que van pasando de un paso al siguiente de la cadena.</summary>
public sealed class ContextoVerificacion(string profesion, string matricula, string jurisdiccion)
{
    public string Profesion { get; } = profesion;
    public string Matricula { get; } = matricula;
    public string Jurisdiccion { get; } = jurisdiccion;

    public RespuestaRegistro? Respuesta { get; set; }
    public string Fuente { get; set; } = "REFEPS";
}

/// <summary>Un paso puede dejar seguir al siguiente o terminar la verificación con un resultado.</summary>
public sealed record PasoResultado(EstadoVerificacion? Estado, string Motivo)
{
    public static PasoResultado Continuar { get; } = new(null, string.Empty);

    public static PasoResultado Concluir(EstadoVerificacion estado, string motivo) => new(estado, motivo);

    public bool Termina => Estado.HasValue;
}

public interface IPasoVerificacion
{
    Task<PasoResultado> EjecutarAsync(ContextoVerificacion contexto, CancellationToken ct);
}

public sealed record ResultadoVerificacion(EstadoVerificacion Estado, string Motivo, string Fuente);

/// <summary>
/// Proceso de verificación en pasos encadenados. El primer paso que concluye decide el resultado;
/// si ninguno concluye, la matrícula queda verificada.
/// </summary>
public sealed class CadenaVerificacion(IEnumerable<IPasoVerificacion> pasos)
{
    private readonly IReadOnlyList<IPasoVerificacion> _pasos = pasos.ToList();

    /// <summary>Cadena estándar: consultar el registro, comprobar habilitación y comprobar coincidencia.</summary>
    public static CadenaVerificacion Estandar(IRegistroProfesionales registro) => new(
    [
        new PasoConsultarRegistro(registro),
        new PasoComprobarHabilitacion(),
        new PasoComprobarCoincidencia()
    ]);

    public async Task<ResultadoVerificacion> EjecutarAsync(ContextoVerificacion contexto, CancellationToken ct)
    {
        foreach (var paso in _pasos)
        {
            var resultado = await paso.EjecutarAsync(contexto, ct);
            if (resultado.Termina)
                return new ResultadoVerificacion(resultado.Estado!.Value, resultado.Motivo, contexto.Fuente);
        }

        return new ResultadoVerificacion(
            EstadoVerificacion.Verificada,
            "La matrícula está habilitada y sus datos coinciden con el registro oficial.",
            contexto.Fuente);
    }
}

/// <summary>Paso 1: consulta el registro oficial. Si no hay respuesta útil, deriva a revisión manual.</summary>
public sealed class PasoConsultarRegistro(IRegistroProfesionales registro) : IPasoVerificacion
{
    public async Task<PasoResultado> EjecutarAsync(ContextoVerificacion contexto, CancellationToken ct)
    {
        RespuestaRegistro respuesta;
        try
        {
            respuesta = await registro.ConsultarAsync(contexto.Matricula, contexto.Jurisdiccion, ct);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            // Una falla del servicio externo no debe tumbar el alta del profesional.
            return PasoResultado.Concluir(
                EstadoVerificacion.RevisionManual,
                "No se pudo consultar el registro oficial; el caso queda en revisión manual.");
        }

        contexto.Fuente = respuesta.Fuente;

        return respuesta.Resultado switch
        {
            ResultadoConsulta.NoEncontrada => PasoResultado.Concluir(
                EstadoVerificacion.RevisionManual,
                "La matrícula no se encontró en el registro oficial; el caso queda en revisión manual."),

            ResultadoConsulta.ServicioNoDisponible => PasoResultado.Concluir(
                EstadoVerificacion.RevisionManual,
                "El registro oficial no está disponible en este momento; el caso queda en revisión manual."),

            _ => Guardar(contexto, respuesta)
        };
    }

    private static PasoResultado Guardar(ContextoVerificacion contexto, RespuestaRegistro respuesta)
    {
        contexto.Respuesta = respuesta;
        return PasoResultado.Continuar;
    }
}

/// <summary>Paso 2: la matrícula tiene que figurar como habilitada.</summary>
public sealed class PasoComprobarHabilitacion : IPasoVerificacion
{
    public Task<PasoResultado> EjecutarAsync(ContextoVerificacion contexto, CancellationToken ct) =>
        Task.FromResult(contexto.Respuesta is { Habilitada: true }
            ? PasoResultado.Continuar
            : PasoResultado.Concluir(
                EstadoVerificacion.Rechazada,
                "El registro oficial informa que la matrícula no está habilitada."));
}

/// <summary>Paso 3: la profesión y la jurisdicción declaradas tienen que coincidir con el registro.</summary>
public sealed class PasoComprobarCoincidencia : IPasoVerificacion
{
    public Task<PasoResultado> EjecutarAsync(ContextoVerificacion contexto, CancellationToken ct)
    {
        var respuesta = contexto.Respuesta;
        if (respuesta is null)
            return Task.FromResult(PasoResultado.Concluir(
                EstadoVerificacion.RevisionManual, "No hay datos del registro oficial para comparar."));

        var profesionCoincide =
            Texto.Normalizar(contexto.Profesion) == Texto.Normalizar(respuesta.Profesion);
        var jurisdiccionCoincide =
            Texto.NormalizarJurisdiccion(contexto.Jurisdiccion) == Texto.NormalizarJurisdiccion(respuesta.Jurisdiccion);

        if (profesionCoincide && jurisdiccionCoincide)
            return Task.FromResult(PasoResultado.Continuar);

        var diferencias = new List<string>();
        if (!profesionCoincide) diferencias.Add("la profesión");
        if (!jurisdiccionCoincide) diferencias.Add("la jurisdicción");

        return Task.FromResult(PasoResultado.Concluir(
            EstadoVerificacion.RevisionManual,
            $"No coincide {string.Join(" ni ", diferencias)} con el registro oficial; el caso queda en revisión manual."));
    }
}
