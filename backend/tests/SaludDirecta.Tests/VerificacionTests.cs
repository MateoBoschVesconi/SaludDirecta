using Microsoft.Extensions.Options;
using SaludDirecta.Application.Abstractions;
using SaludDirecta.Application.Common;
using SaludDirecta.Application.Verificacion;
using SaludDirecta.Domain.Entities;
using SaludDirecta.Infrastructure.Refeps;

namespace SaludDirecta.Tests;

public class CadenaVerificacionTests
{
    private static ContextoVerificacion Declarado(
        string profesion = "Kinesiología", string matricula = "MP 3412", string jurisdiccion = "Chaco") =>
        new(profesion, matricula, jurisdiccion);

    private static RespuestaRegistro Encontrada(
        bool habilitada = true, string profesion = "Kinesiología", string jurisdiccion = "Chaco") =>
        new(ResultadoConsulta.Encontrada, habilitada, profesion, jurisdiccion, "Mateo Gómez");

    private static Task<ResultadoVerificacion> Ejecutar(RegistroFalso registro, ContextoVerificacion contexto) =>
        CadenaVerificacion.Estandar(registro).EjecutarAsync(contexto, CancellationToken.None);

    [Fact]
    public async Task Habilitada_y_con_datos_coincidentes_queda_verificada()
    {
        var resultado = await Ejecutar(new RegistroFalso(Encontrada()), Declarado());

        Assert.Equal(EstadoVerificacion.Verificada, resultado.Estado);
    }

    [Fact]
    public async Task La_comparacion_ignora_mayusculas_y_tildes()
    {
        var resultado = await Ejecutar(
            new RegistroFalso(Encontrada(profesion: "Kinesiología", jurisdiccion: "Córdoba")),
            Declarado(profesion: "KINESIOLOGIA", jurisdiccion: "cordoba"));

        Assert.Equal(EstadoVerificacion.Verificada, resultado.Estado);
    }

    [Fact]
    public async Task CABA_se_reconoce_con_cualquiera_de_sus_nombres()
    {
        var resultado = await Ejecutar(
            new RegistroFalso(Encontrada(jurisdiccion: "Ciudad Autónoma de Buenos Aires")),
            Declarado(jurisdiccion: "CABA"));

        Assert.Equal(EstadoVerificacion.Verificada, resultado.Estado);
    }

    [Fact]
    public async Task Matricula_no_habilitada_se_rechaza()
    {
        var resultado = await Ejecutar(new RegistroFalso(Encontrada(habilitada: false)), Declarado());

        Assert.Equal(EstadoVerificacion.Rechazada, resultado.Estado);
    }

    [Fact]
    public async Task Matricula_no_encontrada_pasa_a_revision_manual()
    {
        var resultado = await Ejecutar(
            new RegistroFalso(new RespuestaRegistro(ResultadoConsulta.NoEncontrada)), Declarado());

        Assert.Equal(EstadoVerificacion.RevisionManual, resultado.Estado);
    }

    [Fact]
    public async Task Servicio_no_disponible_pasa_a_revision_manual()
    {
        var resultado = await Ejecutar(
            new RegistroFalso(new RespuestaRegistro(ResultadoConsulta.ServicioNoDisponible)), Declarado());

        Assert.Equal(EstadoVerificacion.RevisionManual, resultado.Estado);
    }

    [Fact]
    public async Task Si_el_cliente_del_registro_lanza_una_excepcion_pasa_a_revision_manual()
    {
        var resultado = await Ejecutar(
            new RegistroFalso(falla: new HttpRequestException("timeout")), Declarado());

        Assert.Equal(EstadoVerificacion.RevisionManual, resultado.Estado);
    }

    [Fact]
    public async Task Profesion_distinta_pasa_a_revision_manual_y_no_da_distintivo()
    {
        var resultado = await Ejecutar(
            new RegistroFalso(Encontrada(profesion: "Nutrición")), Declarado(profesion: "Kinesiología"));

        Assert.Equal(EstadoVerificacion.RevisionManual, resultado.Estado);
        Assert.Contains("profesión", resultado.Motivo);
    }

    [Fact]
    public async Task Jurisdiccion_distinta_pasa_a_revision_manual()
    {
        var resultado = await Ejecutar(
            new RegistroFalso(Encontrada(jurisdiccion: "Corrientes")), Declarado(jurisdiccion: "Chaco"));

        Assert.Equal(EstadoVerificacion.RevisionManual, resultado.Estado);
        Assert.Contains("jurisdicción", resultado.Motivo);
    }

    [Fact]
    public async Task Si_un_paso_concluye_los_siguientes_no_se_ejecutan()
    {
        var registro = new RegistroFalso(new RespuestaRegistro(ResultadoConsulta.NoEncontrada));
        var resultado = await Ejecutar(registro, Declarado());

        Assert.Equal(EstadoVerificacion.RevisionManual, resultado.Estado);
        Assert.Equal(1, registro.Consultas);
    }
}

public class VerificacionServiceTests
{
    private readonly RepositorioEnMemoria _usuarios = new();
    private readonly VerificacionRepositorioEnMemoria _verificaciones = new();

    private VerificacionService Crear(RegistroFalso registro) =>
        new(_usuarios, _verificaciones, CadenaVerificacion.Estandar(registro), TimeProvider.System);

    private async Task<Usuario> ProfesionalAsync(string matricula = "MP 3412")
    {
        var usuario = Usuario.Crear(
            "Lic. Mateo Gómez", $"{Guid.NewGuid():N}@ejemplo.com", "3624999999", "hash:x", Rol.Profesional,
            "Kinesiología", matricula, "Chaco", true, DateTime.UtcNow);
        await _usuarios.AgregarAsync(usuario, CancellationToken.None);
        return usuario;
    }

    private static RegistroFalso RegistroHabilitado() => new(new RespuestaRegistro(
        ResultadoConsulta.Encontrada, true, "Kinesiología", "Chaco", "Mateo Gómez", "SIMULADO"));

    [Fact]
    public async Task Verificar_guarda_el_resultado_y_su_fecha()
    {
        var usuario = await ProfesionalAsync();

        var dto = await Crear(RegistroHabilitado()).VerificarAsync(usuario.Id);

        Assert.Equal("verificada", dto.Estado);
        Assert.True(dto.Distintivo);
        var guardada = Assert.Single(_verificaciones.Verificaciones);
        Assert.Equal(usuario.Id, guardada.UsuarioId);
        Assert.Equal("SIMULADO", guardada.Fuente);
    }

    [Fact]
    public async Task Cada_verificacion_queda_en_la_bitacora_de_auditoria()
    {
        var usuario = await ProfesionalAsync();

        await Crear(RegistroHabilitado()).VerificarAsync(usuario.Id);

        var evento = Assert.Single(_verificaciones.Auditoria);
        Assert.Equal(VerificacionService.AccionAuditoria, evento.Accion);
        Assert.Equal(usuario.Id, evento.UsuarioId);
    }

    [Fact]
    public async Task Un_paciente_no_puede_verificar_matricula()
    {
        var paciente = Usuario.Crear(
            "Ana Pérez", "ana@ejemplo.com", "3624123456", "hash:x", Rol.Paciente,
            null, null, null, true, DateTime.UtcNow);
        await _usuarios.AgregarAsync(paciente, CancellationToken.None);

        await Assert.ThrowsAsync<ValidacionException>(
            () => Crear(RegistroHabilitado()).VerificarAsync(paciente.Id));
        Assert.Empty(_verificaciones.Verificaciones);
    }

    [Fact]
    public async Task Usuario_inexistente_se_rechaza()
    {
        await Assert.ThrowsAsync<CredencialesInvalidasException>(
            () => Crear(RegistroHabilitado()).VerificarAsync(Guid.NewGuid()));
    }

    [Fact]
    public async Task Un_caso_no_resuelto_no_da_distintivo()
    {
        var usuario = await ProfesionalAsync();
        var servicio = Crear(new RegistroFalso(new RespuestaRegistro(ResultadoConsulta.NoEncontrada)));

        var dto = await servicio.VerificarAsync(usuario.Id);
        var distintivo = await servicio.ObtenerDistintivoAsync(usuario.Id);

        Assert.Equal("revision_manual", dto.Estado);
        Assert.False(dto.Distintivo);
        Assert.False(distintivo.Verificado);
    }

    [Fact]
    public async Task El_distintivo_publico_es_true_solo_tras_una_verificacion_exitosa()
    {
        var usuario = await ProfesionalAsync();
        var servicio = Crear(RegistroHabilitado());

        Assert.False((await servicio.ObtenerDistintivoAsync(usuario.Id)).Verificado);

        await servicio.VerificarAsync(usuario.Id);

        var distintivo = await servicio.ObtenerDistintivoAsync(usuario.Id);
        Assert.True(distintivo.Verificado);
        Assert.NotNull(distintivo.VerificadaEn);
    }

    [Fact]
    public async Task Sin_verificacion_previa_el_estado_es_sin_verificar()
    {
        var usuario = await ProfesionalAsync();

        var dto = await Crear(RegistroHabilitado()).ObtenerEstadoAsync(usuario.Id);

        Assert.Equal("sin_verificar", dto.Estado);
        Assert.False(dto.Distintivo);
    }
}

public class RegistroProfesionalesSimuladoTests
{
    private static RegistroProfesionalesSimulado Crear() => new(Options.Create(new RefepsOptions
    {
        PadronSimulado =
        [
            new ProfesionalPadron
            {
                Matricula = "MP 3412", Nombre = "Mateo Gómez",
                Profesion = "Kinesiología", Jurisdiccion = "Chaco", Habilitada = true
            }
        ]
    }));

    [Theory]
    [InlineData("MP 3412")]
    [InlineData("mp-3412")]
    [InlineData("MP3412")]
    public async Task Encuentra_la_matricula_sin_importar_el_formato(string matricula)
    {
        var respuesta = await Crear().ConsultarAsync(matricula, "Chaco", CancellationToken.None);

        Assert.Equal(ResultadoConsulta.Encontrada, respuesta.Resultado);
        Assert.True(respuesta.Habilitada);
        Assert.Equal("SIMULADO", respuesta.Fuente);
    }

    [Fact]
    public async Task Una_matricula_desconocida_no_se_encuentra()
    {
        var respuesta = await Crear().ConsultarAsync("MP 9999", "Chaco", CancellationToken.None);

        Assert.Equal(ResultadoConsulta.NoEncontrada, respuesta.Resultado);
    }

    [Fact]
    public async Task La_matricula_SIN_SERVICIO_simula_el_servicio_caido()
    {
        var respuesta = await Crear().ConsultarAsync("SIN-SERVICIO", "Chaco", CancellationToken.None);

        Assert.Equal(ResultadoConsulta.ServicioNoDisponible, respuesta.Resultado);
    }
}
