using Microsoft.Extensions.Options;
using SaludDirecta.Application.Abstractions;
using SaludDirecta.Application.Common;

namespace SaludDirecta.Infrastructure.Refeps;

public sealed class RefepsOptions
{
    public const string Seccion = "Refeps";

    /// <summary>Padrón de profesionales de prueba. Se edita en appsettings, sin tocar código.</summary>
    public List<ProfesionalPadron> PadronSimulado { get; set; } = [];
}

public sealed class ProfesionalPadron
{
    public string Matricula { get; set; } = string.Empty;
    public string Nombre { get; set; } = string.Empty;
    public string Profesion { get; set; } = string.Empty;
    public string Jurisdiccion { get; set; } = string.Empty;
    public bool Habilitada { get; set; } = true;
}

/// <summary>
/// Adapter simulado del registro oficial (REFEPS/SISA) para desarrollo y pruebas.
/// Busca la matrícula en el padrón configurado. La matrícula "SIN-SERVICIO" simula
/// que el servicio externo está caído.
///
/// Para usar el servicio real hay que escribir otra clase que implemente
/// <see cref="IRegistroProfesionales"/> y registrarla en DependencyInjection;
/// la lógica de verificación no cambia.
/// </summary>
public sealed class RegistroProfesionalesSimulado(IOptions<RefepsOptions> opciones) : IRegistroProfesionales
{
    public const string MatriculaServicioCaido = "SINSERVICIO";
    private const string Fuente = "SIMULADO";

    public Task<RespuestaRegistro> ConsultarAsync(string matricula, string jurisdiccion, CancellationToken ct)
    {
        var buscada = Texto.NormalizarMatricula(matricula);

        if (buscada == MatriculaServicioCaido)
            return Task.FromResult(new RespuestaRegistro(ResultadoConsulta.ServicioNoDisponible, Fuente: Fuente));

        var profesional = opciones.Value.PadronSimulado
            .FirstOrDefault(p => Texto.NormalizarMatricula(p.Matricula) == buscada);

        return Task.FromResult(profesional is null
            ? new RespuestaRegistro(ResultadoConsulta.NoEncontrada, Fuente: Fuente)
            : new RespuestaRegistro(
                ResultadoConsulta.Encontrada,
                profesional.Habilitada,
                profesional.Profesion,
                profesional.Jurisdiccion,
                profesional.Nombre,
                Fuente));
    }
}
