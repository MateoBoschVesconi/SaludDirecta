using SaludDirecta.Application.Common;
using SaludDirecta.Application.Perfil;
using SaludDirecta.Domain.Entities;
using SaludDirecta.Domain.Exceptions;

namespace SaludDirecta.Tests;

public class PerfilProfesionalTests
{
    private static readonly DateTime Ahora = new(2026, 11, 13, 12, 0, 0, DateTimeKind.Utc);

    private static PerfilProfesional Nuevo() => PerfilProfesional.Crear(Guid.NewGuid(), Ahora);

    [Fact]
    public void Un_perfil_nuevo_esta_vacio_y_sin_publicar()
    {
        var perfil = Nuevo();

        Assert.Null(perfil.HonorarioConsulta);
        Assert.False(perfil.Publicado);
        Assert.Equal(PerfilProfesional.DuracionPorDefecto, perfil.DuracionSesionMinutos);
    }

    [Fact]
    public void No_se_puede_publicar_sin_honorario()
    {
        var perfil = Nuevo();

        Assert.Throws<DominioException>(() => perfil.Publicar(Ahora));
        Assert.False(perfil.Publicado);
    }

    [Fact]
    public void Con_honorario_se_puede_publicar_y_despublicar()
    {
        var perfil = Nuevo();
        perfil.CambiarHonorario(25000m, Ahora);

        perfil.Publicar(Ahora);
        Assert.True(perfil.Publicado);

        perfil.Despublicar(Ahora);
        Assert.False(perfil.Publicado);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-100)]
    public void El_honorario_debe_ser_mayor_a_cero(int valor)
    {
        var perfil = Nuevo();

        Assert.Throws<DominioException>(() => perfil.CambiarHonorario(valor, Ahora));
        Assert.Null(perfil.HonorarioConsulta);
    }

    [Fact]
    public void El_honorario_no_puede_superar_el_maximo()
    {
        var perfil = Nuevo();

        Assert.Throws<DominioException>(
            () => perfil.CambiarHonorario(PerfilProfesional.HonorarioMaximo + 1, Ahora));
    }

    [Fact]
    public void Cambiar_el_honorario_informa_si_hubo_cambio()
    {
        var perfil = Nuevo();

        Assert.True(perfil.CambiarHonorario(25000m, Ahora));
        Assert.False(perfil.CambiarHonorario(25000m, Ahora));
        Assert.True(perfil.CambiarHonorario(27000m, Ahora));
        Assert.Equal((decimal?)27000m, perfil.HonorarioConsulta);
    }

    [Fact]
    public void El_honorario_se_redondea_a_dos_decimales()
    {
        var perfil = Nuevo();

        perfil.CambiarHonorario(25000.456m, Ahora);

        Assert.Equal((decimal?)25000.46m, perfil.HonorarioConsulta);
    }

    [Fact]
    public void Actualizar_datos_limpia_espacios_y_deja_vacios_como_nulos()
    {
        var perfil = Nuevo();

        perfil.ActualizarDatos("  Rehabilitación  ", "   ", " Av. Sarmiento 450 ", "Resistencia", null,
            45, true, false, true, Ahora);

        Assert.Equal("Rehabilitación", perfil.Especialidad);
        Assert.Null(perfil.Descripcion);
        Assert.Equal("Av. Sarmiento 450", perfil.Direccion);
        Assert.Null(perfil.Telefono);
        Assert.Equal(45, perfil.DuracionSesionMinutos);
        Assert.True(perfil.TieneRampa);
        Assert.False(perfil.TieneAscensor);
        Assert.True(perfil.TieneBanoAdaptado);
    }

    [Theory]
    [InlineData(1)]
    [InlineData(4)]
    [InlineData(241)]
    public void La_duracion_de_la_sesion_debe_estar_en_rango(int minutos)
    {
        var perfil = Nuevo();

        Assert.Throws<DominioException>(
            () => perfil.ActualizarDatos(null, null, null, null, null, minutos, false, false, false, Ahora));
    }

    [Fact]
    public void La_descripcion_tiene_un_largo_maximo()
    {
        var perfil = Nuevo();

        Assert.Throws<DominioException>(() => perfil.ActualizarDatos(
            null, new string('a', 1001), null, null, null, 30, false, false, false, Ahora));
    }
}

public class PrestacionTests
{
    private static readonly DateTime Ahora = new(2026, 11, 13, 12, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void Una_prestacion_nueva_esta_activa()
    {
        var prestacion = Prestacion.Crear(Guid.NewGuid(), "  Primera consulta ", 60, Ahora);

        Assert.Equal("Primera consulta", prestacion.Nombre);
        Assert.Equal(60, prestacion.DuracionMinutos);
        Assert.True(prestacion.Activa);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void El_nombre_es_obligatorio(string nombre)
    {
        Assert.Throws<DominioException>(() => Prestacion.Crear(Guid.NewGuid(), nombre, 30, Ahora));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(4)]
    [InlineData(481)]
    public void La_duracion_debe_estar_en_rango(int minutos)
    {
        Assert.Throws<DominioException>(() => Prestacion.Crear(Guid.NewGuid(), "Sesión", minutos, Ahora));
    }

    [Fact]
    public void Dar_de_baja_la_desactiva_sin_borrarla()
    {
        var prestacion = Prestacion.Crear(Guid.NewGuid(), "Sesión", 30, Ahora);

        prestacion.DarDeBaja();

        Assert.False(prestacion.Activa);
    }
}

public class PerfilServiceTests
{
    private readonly RepositorioEnMemoria _usuarios = new();
    private readonly PerfilRepositorioEnMemoria _perfiles = new();
    private readonly PrestacionRepositorioEnMemoria _prestaciones = new();
    private readonly VerificacionRepositorioEnMemoria _verificaciones = new();

    private PerfilService Crear() => new(_usuarios, _perfiles, _prestaciones, _verificaciones, TimeProvider.System);

    private async Task<Usuario> ProfesionalAsync()
    {
        var usuario = Usuario.Crear(
            "Lic. Mateo Gómez", $"{Guid.NewGuid():N}@ejemplo.com", "3624999999", "hash:x", Rol.Profesional,
            "Kinesiología", "MP 3412", "Chaco", true, DateTime.UtcNow);
        await _usuarios.AgregarAsync(usuario, CancellationToken.None);
        return usuario;
    }

    private static GuardarPerfilRequest Datos(int duracion = 45) =>
        new("Rehabilitación Deportiva", "Más de 8 años de experiencia.", "Av. Sarmiento 450", "Resistencia",
            "3624-889900", duracion, true, true, false);

    private void MarcarVerificado(Usuario usuario) =>
        _verificaciones.Verificaciones.Add(VerificacionMatricula.Crear(
            usuario.Id, "Kinesiología", "MP 3412", "Chaco",
            EstadoVerificacion.Verificada, "Coincide.", "SIMULADO", DateTime.UtcNow));

    private async Task<Usuario> ProfesionalPublicadoAsync(decimal honorario = 25000m)
    {
        var usuario = await ProfesionalAsync();
        var servicio = Crear();
        await servicio.GuardarPerfilAsync(usuario.Id, Datos());
        await servicio.CambiarHonorarioAsync(usuario.Id, new CambiarHonorarioRequest(honorario));
        await servicio.PublicarAsync(usuario.Id);
        return usuario;
    }

    // ---------- Perfil propio ----------

    [Fact]
    public async Task Sin_perfil_cargado_se_devuelve_uno_vacio()
    {
        var usuario = await ProfesionalAsync();

        var dto = await Crear().ObtenerMiPerfilAsync(usuario.Id);

        Assert.Equal("Lic. Mateo Gómez", dto.Nombre);
        Assert.Equal("MP 3412", dto.Matricula);
        Assert.Null(dto.HonorarioConsulta);
        Assert.False(dto.Publicado);
        Assert.Equal("sin_verificar", dto.Verificacion.Estado);
        Assert.Empty(_perfiles.Perfiles);
    }

    [Fact]
    public async Task El_perfil_muestra_el_estado_de_verificacion()
    {
        var usuario = await ProfesionalAsync();
        MarcarVerificado(usuario);

        var dto = await Crear().ObtenerMiPerfilAsync(usuario.Id);

        Assert.Equal("verificada", dto.Verificacion.Estado);
        Assert.True(dto.Verificacion.Distintivo);
    }

    [Fact]
    public async Task Un_paciente_no_tiene_perfil_profesional()
    {
        var paciente = Usuario.Crear(
            "Ana Pérez", "ana@ejemplo.com", "3624123456", "hash:x", Rol.Paciente,
            null, null, null, true, DateTime.UtcNow);
        await _usuarios.AgregarAsync(paciente, CancellationToken.None);

        await Assert.ThrowsAsync<ValidacionException>(() => Crear().ObtenerMiPerfilAsync(paciente.Id));
        await Assert.ThrowsAsync<ValidacionException>(() => Crear().GuardarPerfilAsync(paciente.Id, Datos()));
    }

    [Fact]
    public async Task Un_usuario_inexistente_no_tiene_sesion_valida()
    {
        await Assert.ThrowsAsync<CredencialesInvalidasException>(
            () => Crear().ObtenerMiPerfilAsync(Guid.NewGuid()));
    }

    [Fact]
    public async Task Guardar_el_perfil_lo_crea_y_despues_lo_actualiza_sin_duplicarlo()
    {
        var usuario = await ProfesionalAsync();
        var servicio = Crear();

        await servicio.GuardarPerfilAsync(usuario.Id, Datos(45));
        var dto = await servicio.GuardarPerfilAsync(usuario.Id, Datos(60));

        Assert.Single(_perfiles.Perfiles);
        Assert.Equal(60, dto.DuracionSesionMinutos);
        Assert.Equal("Resistencia", dto.Ciudad);
        Assert.True(dto.TieneRampa);
        Assert.False(dto.TieneBanoAdaptado);
    }

    [Fact]
    public async Task Un_perfil_con_datos_invalidos_no_se_guarda()
    {
        var usuario = await ProfesionalAsync();

        await Assert.ThrowsAsync<ValidacionException>(
            () => Crear().GuardarPerfilAsync(usuario.Id, Datos(duracion: 1)));

        Assert.Empty(_perfiles.Perfiles);
    }

    // ---------- Honorarios e historial ----------

    [Fact]
    public async Task El_primer_honorario_queda_en_el_historial_y_en_la_auditoria()
    {
        var usuario = await ProfesionalAsync();

        var dto = await Crear().CambiarHonorarioAsync(usuario.Id, new CambiarHonorarioRequest(25000m));

        Assert.Equal((decimal?)25000m, dto.HonorarioConsulta);
        var fila = Assert.Single(_perfiles.Historial);
        Assert.Null(fila.ValorAnterior);
        Assert.Equal(25000m, fila.ValorNuevo);
        var evento = Assert.Single(_perfiles.Auditoria);
        Assert.Equal(PerfilService.AccionAuditoria, evento.Accion);
        Assert.Equal(usuario.Id, evento.UsuarioId);
        Assert.Contains("25000.00", evento.Detalle);
    }

    [Fact]
    public async Task Cada_modificacion_del_honorario_guarda_el_valor_anterior()
    {
        var usuario = await ProfesionalAsync();
        var servicio = Crear();

        await servicio.CambiarHonorarioAsync(usuario.Id, new CambiarHonorarioRequest(25000m));
        await servicio.CambiarHonorarioAsync(usuario.Id, new CambiarHonorarioRequest(28000m));

        Assert.Equal(2, _perfiles.Historial.Count);
        Assert.Equal(2, _perfiles.Auditoria.Count);
        var ultimo = _perfiles.Historial[1];
        Assert.Equal((decimal?)25000m, ultimo.ValorAnterior);
        Assert.Equal(28000m, ultimo.ValorNuevo);
        Assert.Contains("25000.00", _perfiles.Auditoria[1].Detalle);
        Assert.Contains("28000.00", _perfiles.Auditoria[1].Detalle);
    }

    [Fact]
    public async Task Repetir_el_mismo_honorario_no_registra_nada()
    {
        var usuario = await ProfesionalAsync();
        var servicio = Crear();
        await servicio.CambiarHonorarioAsync(usuario.Id, new CambiarHonorarioRequest(25000m));

        await servicio.CambiarHonorarioAsync(usuario.Id, new CambiarHonorarioRequest(25000m));

        Assert.Single(_perfiles.Historial);
        Assert.Single(_perfiles.Auditoria);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-5)]
    public async Task Un_honorario_invalido_se_rechaza_y_no_deja_rastros(int valor)
    {
        var usuario = await ProfesionalAsync();

        await Assert.ThrowsAsync<ValidacionException>(
            () => Crear().CambiarHonorarioAsync(usuario.Id, new CambiarHonorarioRequest(valor)));

        Assert.Empty(_perfiles.Perfiles);
        Assert.Empty(_perfiles.Historial);
        Assert.Empty(_perfiles.Auditoria);
    }

    [Fact]
    public async Task El_historial_se_devuelve_del_mas_reciente_al_mas_antiguo()
    {
        var usuario = await ProfesionalAsync();
        var servicio = Crear();
        await servicio.CambiarHonorarioAsync(usuario.Id, new CambiarHonorarioRequest(25000m));
        await Task.Delay(5);
        await servicio.CambiarHonorarioAsync(usuario.Id, new CambiarHonorarioRequest(28000m));

        var historial = await servicio.ObtenerHistorialHonorariosAsync(usuario.Id);

        Assert.Equal(2, historial.Count);
        Assert.Equal(28000m, historial[0].ValorNuevo);
        Assert.Equal(25000m, historial[1].ValorNuevo);
    }

    // ---------- Publicación ----------

    [Fact]
    public async Task No_se_puede_publicar_sin_haber_cargado_el_perfil()
    {
        var usuario = await ProfesionalAsync();

        var error = await Assert.ThrowsAsync<ValidacionException>(() => Crear().PublicarAsync(usuario.Id));

        Assert.Contains("valor de la consulta", error.Message);
    }

    [Fact]
    public async Task No_se_puede_publicar_un_perfil_sin_honorario()
    {
        var usuario = await ProfesionalAsync();
        var servicio = Crear();
        await servicio.GuardarPerfilAsync(usuario.Id, Datos());

        var error = await Assert.ThrowsAsync<ValidacionException>(() => servicio.PublicarAsync(usuario.Id));

        Assert.Contains("valor de la consulta", error.Message);
        Assert.False(_perfiles.Perfiles[0].Publicado);
    }

    [Fact]
    public async Task Con_honorario_el_perfil_se_publica()
    {
        var usuario = await ProfesionalPublicadoAsync();

        var dto = await Crear().ObtenerMiPerfilAsync(usuario.Id);

        Assert.True(dto.Publicado);
    }

    [Fact]
    public async Task Despublicar_oculta_el_perfil()
    {
        var usuario = await ProfesionalPublicadoAsync();

        var dto = await Crear().DespublicarAsync(usuario.Id);

        Assert.False(dto.Publicado);
    }

    // ---------- Vista pública ----------

    [Fact]
    public async Task El_perfil_publico_muestra_honorario_y_estado_de_verificacion()
    {
        var usuario = await ProfesionalPublicadoAsync(25000m);
        MarcarVerificado(usuario);

        var dto = await Crear().ObtenerPerfilPublicoAsync(usuario.Id);

        Assert.Equal("Lic. Mateo Gómez", dto.Nombre);
        Assert.Equal(25000m, dto.HonorarioConsulta);
        Assert.True(dto.Verificado);
        Assert.NotNull(dto.VerificadaEn);
        Assert.Equal("Rehabilitación Deportiva", dto.Especialidad);
        Assert.True(dto.TieneRampa);
    }

    [Fact]
    public async Task El_perfil_publico_de_un_profesional_sin_verificar_no_tiene_distintivo()
    {
        var usuario = await ProfesionalPublicadoAsync();

        var dto = await Crear().ObtenerPerfilPublicoAsync(usuario.Id);

        Assert.False(dto.Verificado);
        Assert.Null(dto.VerificadaEn);
    }

    [Fact]
    public async Task El_perfil_publico_incluye_las_prestaciones_activas()
    {
        var usuario = await ProfesionalPublicadoAsync();
        var prestaciones = new PrestacionService(_prestaciones, TimeProvider.System);
        await prestaciones.CrearAsync(usuario.Id, new GuardarPrestacionRequest("Sesión de rehabilitación", 45));
        var baja = await prestaciones.CrearAsync(usuario.Id, new GuardarPrestacionRequest("Evaluación", 60));
        await prestaciones.EliminarAsync(usuario.Id, baja.Id);

        var dto = await Crear().ObtenerPerfilPublicoAsync(usuario.Id);

        var unica = Assert.Single(dto.Prestaciones);
        Assert.Equal("Sesión de rehabilitación", unica.Nombre);
    }

    [Fact]
    public async Task Un_perfil_sin_publicar_no_tiene_vista_publica()
    {
        var usuario = await ProfesionalAsync();
        var servicio = Crear();
        await servicio.GuardarPerfilAsync(usuario.Id, Datos());
        await servicio.CambiarHonorarioAsync(usuario.Id, new CambiarHonorarioRequest(25000m));

        await Assert.ThrowsAsync<NoEncontradoException>(() => servicio.ObtenerPerfilPublicoAsync(usuario.Id));
    }

    [Fact]
    public async Task Un_perfil_despublicado_deja_de_verse()
    {
        var usuario = await ProfesionalPublicadoAsync();
        var servicio = Crear();
        await servicio.DespublicarAsync(usuario.Id);

        await Assert.ThrowsAsync<NoEncontradoException>(() => servicio.ObtenerPerfilPublicoAsync(usuario.Id));
    }

    [Fact]
    public async Task La_vista_publica_no_existe_para_ids_desconocidos_ni_para_pacientes()
    {
        var paciente = Usuario.Crear(
            "Ana Pérez", "ana@ejemplo.com", "3624123456", "hash:x", Rol.Paciente,
            null, null, null, true, DateTime.UtcNow);
        await _usuarios.AgregarAsync(paciente, CancellationToken.None);

        await Assert.ThrowsAsync<NoEncontradoException>(() => Crear().ObtenerPerfilPublicoAsync(Guid.NewGuid()));
        await Assert.ThrowsAsync<NoEncontradoException>(() => Crear().ObtenerPerfilPublicoAsync(paciente.Id));
    }
}

public class PrestacionServiceTests
{
    private readonly PrestacionRepositorioEnMemoria _repositorio = new();

    private PrestacionService Crear() => new(_repositorio, TimeProvider.System);

    [Fact]
    public async Task Crear_y_listar_ordena_por_nombre()
    {
        var profesional = Guid.NewGuid();
        var servicio = Crear();
        await servicio.CrearAsync(profesional, new GuardarPrestacionRequest("Sesión", 45));
        await servicio.CrearAsync(profesional, new GuardarPrestacionRequest("Evaluación inicial", 60));

        var lista = await servicio.ListarAsync(profesional);

        Assert.Equal(2, lista.Count);
        Assert.Equal("Evaluación inicial", lista[0].Nombre);
        Assert.Equal("Sesión", lista[1].Nombre);
    }

    [Fact]
    public async Task Cada_profesional_ve_solo_sus_prestaciones()
    {
        var servicio = Crear();
        await servicio.CrearAsync(Guid.NewGuid(), new GuardarPrestacionRequest("Sesión", 45));

        var lista = await servicio.ListarAsync(Guid.NewGuid());

        Assert.Empty(lista);
    }

    [Fact]
    public async Task Una_prestacion_invalida_no_se_guarda()
    {
        var servicio = Crear();

        await Assert.ThrowsAsync<ValidacionException>(
            () => servicio.CrearAsync(Guid.NewGuid(), new GuardarPrestacionRequest("", 30)));
        await Assert.ThrowsAsync<ValidacionException>(
            () => servicio.CrearAsync(Guid.NewGuid(), new GuardarPrestacionRequest("Sesión", 0)));

        Assert.Empty(_repositorio.Todas);
    }

    [Fact]
    public async Task Se_puede_modificar_una_prestacion_propia()
    {
        var profesional = Guid.NewGuid();
        var servicio = Crear();
        var creada = await servicio.CrearAsync(profesional, new GuardarPrestacionRequest("Sesión", 45));

        var dto = await servicio.ActualizarAsync(profesional, creada.Id, new GuardarPrestacionRequest("Sesión larga", 60));

        Assert.Equal("Sesión larga", dto.Nombre);
        Assert.Equal(60, dto.DuracionMinutos);
    }

    [Fact]
    public async Task No_se_puede_tocar_la_prestacion_de_otro_profesional()
    {
        var titular = Guid.NewGuid();
        var servicio = Crear();
        var creada = await servicio.CrearAsync(titular, new GuardarPrestacionRequest("Sesión", 45));
        var intruso = Guid.NewGuid();

        await Assert.ThrowsAsync<NoEncontradoException>(
            () => servicio.ActualizarAsync(intruso, creada.Id, new GuardarPrestacionRequest("Otra", 30)));
        await Assert.ThrowsAsync<NoEncontradoException>(() => servicio.EliminarAsync(intruso, creada.Id));

        var intacta = Assert.Single(await servicio.ListarAsync(titular));
        Assert.Equal("Sesión", intacta.Nombre);
    }

    [Fact]
    public async Task Eliminar_hace_una_baja_logica()
    {
        var profesional = Guid.NewGuid();
        var servicio = Crear();
        var creada = await servicio.CrearAsync(profesional, new GuardarPrestacionRequest("Sesión", 45));

        await servicio.EliminarAsync(profesional, creada.Id);

        Assert.Empty(await servicio.ListarAsync(profesional));
        var guardada = Assert.Single(_repositorio.Todas);
        Assert.False(guardada.Activa);
        await Assert.ThrowsAsync<NoEncontradoException>(() => servicio.EliminarAsync(profesional, creada.Id));
    }
}
