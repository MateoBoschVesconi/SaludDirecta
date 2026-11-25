using System.Reflection;
using SaludDirecta.Application.Common;
using SaludDirecta.Application.Cuenta;
using SaludDirecta.Application.Perfil;
using SaludDirecta.Application.Turnos;
using SaludDirecta.Domain.Entities;
using SaludDirecta.Domain.Exceptions;

namespace SaludDirecta.Tests;

public class UsuarioAnonimizacionTests
{
    private static readonly DateTime Ahora = new(2026, 11, 16, 12, 0, 0, DateTimeKind.Utc);

    private static Usuario Paciente() =>
        Usuario.Crear("Ana Pérez", "ana@ejemplo.com", "3624123456", "hash:x", Rol.Paciente, null, null, null, true, Ahora);

    private static Usuario Profesional() =>
        Usuario.Crear("Lic. Mateo Gómez", "mateo@ejemplo.com", "3624999999", "hash:x", Rol.Profesional,
            "Kinesiología", "MP 3412", "Chaco", true, Ahora);

    [Fact]
    public void Anonimizar_borra_los_datos_personales_y_deja_la_cuenta_inutilizable()
    {
        var usuario = Paciente();

        usuario.Anonimizar(Ahora);

        Assert.True(usuario.EstaEliminado);
        Assert.Equal(Ahora, usuario.EliminadoEn!.Value);
        Assert.Equal("Usuario eliminado", usuario.Nombre);
        Assert.Equal(string.Empty, usuario.Telefono);
        Assert.False(usuario.Email.Contains("ana"));
        Assert.True(usuario.Email.EndsWith("@saluddirecta.invalid"));
        Assert.False(new HasherFalso().Verificar("x", usuario.PasswordHash));
    }

    [Fact]
    public void Anonimizar_a_un_profesional_reemplaza_matricula_profesion_y_jurisdiccion()
    {
        var usuario = Profesional();

        usuario.Anonimizar(Ahora);

        Assert.Equal("Eliminada", usuario.Matricula);
        Assert.Equal("Eliminado", usuario.Profesion);
        Assert.Equal("Eliminada", usuario.Jurisdiccion);
    }

    [Fact]
    public void Cada_cuenta_anonimizada_tiene_un_correo_distinto()
    {
        var uno = Paciente();
        var otro = Paciente();

        uno.Anonimizar(Ahora);
        otro.Anonimizar(Ahora);

        Assert.NotEqual(uno.Email, otro.Email);
    }

    [Fact]
    public void Anonimizar_dos_veces_conserva_el_primer_momento()
    {
        var usuario = Paciente();

        usuario.Anonimizar(Ahora);
        usuario.Anonimizar(Ahora.AddDays(3));

        Assert.Equal(Ahora, usuario.EliminadoEn!.Value);
    }
}

public class CuentaServiceTests
{
    private readonly EscenarioAgenda _e = new();

    // En el escenario, la contraseña de todos los usuarios es "x".
    private static EliminarCuentaRequest ConClave(string? clave = "x") => new(clave);

    // ---------- Derecho de acceso ----------

    [Fact]
    public async Task El_paciente_exporta_sus_datos_con_sus_turnos_y_avisos()
    {
        var pro = await _e.ProfesionalAsync();
        var paciente = await _e.PacienteAsync("Ana Pérez");
        await _e.Turnos.ReservarAsync(paciente.Id, EscenarioAgenda.Pedido(pro, "09:00"));

        var datos = await _e.Cuenta.ExportarMisDatosAsync(paciente.Id);

        Assert.Equal("Ana Pérez", datos.Cuenta.Nombre);
        Assert.Equal(paciente.Email, datos.Cuenta.Email);
        Assert.Equal("paciente", datos.Cuenta.Rol);
        Assert.Null(datos.Perfil);
        var turno = Assert.Single(datos.Turnos);
        Assert.Equal("2026-11-23", turno.Fecha);
        Assert.Equal("09:00", turno.Hora);
        Assert.Equal("solicitado", turno.Estado);
        Assert.Equal("Lic. Mateo Gómez", turno.Contraparte);
        Assert.Single(datos.Notificaciones);
    }

    [Fact]
    public async Task El_profesional_exporta_ademas_su_perfil()
    {
        var pro = await _e.ProfesionalAsync();

        var datos = await _e.Cuenta.ExportarMisDatosAsync(pro.Id);

        Assert.Equal("profesional", datos.Cuenta.Rol);
        Assert.Equal("MP 3412", datos.Cuenta.Matricula);
        Assert.NotNull(datos.Perfil);
        Assert.Equal(25000m, datos.Perfil!.HonorarioConsulta!.Value);
        Assert.True(datos.Perfil.Publicado);
    }

    [Fact]
    public async Task Cada_uno_exporta_solo_sus_propios_datos()
    {
        var pro = await _e.ProfesionalAsync();
        var ana = await _e.PacienteAsync("Ana");
        var luis = await _e.PacienteAsync("Luis");
        await _e.Turnos.ReservarAsync(ana.Id, EscenarioAgenda.Pedido(pro, "09:00"));

        var datosDeLuis = await _e.Cuenta.ExportarMisDatosAsync(luis.Id);

        Assert.Empty(datosDeLuis.Turnos);
        Assert.Empty(datosDeLuis.Notificaciones);
    }

    [Fact]
    public async Task Un_usuario_inexistente_no_puede_exportar()
    {
        await Assert.ThrowsAsync<CredencialesInvalidasException>(() => _e.Cuenta.ExportarMisDatosAsync(Guid.NewGuid()));
    }

    // ---------- Derecho de supresión ----------

    [Theory]
    [InlineData("incorrecta")]
    [InlineData("")]
    public async Task Sin_la_contrasena_correcta_no_se_elimina_nada(string clave)
    {
        var paciente = await _e.PacienteAsync("Ana Pérez");

        await Assert.ThrowsAsync<ValidacionException>(() => _e.Cuenta.EliminarCuentaAsync(paciente.Id, ConClave(clave)));

        Assert.False(paciente.EstaEliminado);
        Assert.Equal("Ana Pérez", paciente.Nombre);
        Assert.Equal(0, _e.CuentasRepo.Llamadas);
    }

    [Fact]
    public async Task Eliminar_la_cuenta_de_un_paciente_cancela_sus_turnos_activos_y_avisa_al_profesional()
    {
        var pro = await _e.ProfesionalAsync();
        var paciente = await _e.PacienteAsync("Ana Pérez");
        var solicitado = await _e.Turnos.ReservarAsync(paciente.Id, EscenarioAgenda.Pedido(pro, "09:00"));
        var confirmado = await _e.Turnos.ReservarAsync(paciente.Id, EscenarioAgenda.Pedido(pro, "09:45"));
        await _e.Turnos.CambiarEstadoAsync(pro.Id, confirmado.Id, new CambiarEstadoTurnoRequest("confirmado"));
        var cumplido = await _e.Turnos.ReservarAsync(paciente.Id, EscenarioAgenda.Pedido(pro, "10:30"));
        await _e.Turnos.CambiarEstadoAsync(pro.Id, cumplido.Id, new CambiarEstadoTurnoRequest("confirmado"));
        await _e.Turnos.CambiarEstadoAsync(pro.Id, cumplido.Id, new CambiarEstadoTurnoRequest("cumplido"));

        var resultado = await _e.Cuenta.EliminarCuentaAsync(paciente.Id, ConClave());

        Assert.Equal(2, resultado.TurnosCancelados);
        Assert.Equal(EstadoTurno.Cancelado, _e.TurnosRepo.Todos.Single(t => t.Id == solicitado.Id).Estado);
        Assert.Equal(EstadoTurno.Cancelado, _e.TurnosRepo.Todos.Single(t => t.Id == confirmado.Id).Estado);
        Assert.Equal(EstadoTurno.Cumplido, _e.TurnosRepo.Todos.Single(t => t.Id == cumplido.Id).Estado); // el historial se conserva
        Assert.Equal(2, _e.Notificaciones.Todas.Count(n =>
            n.UsuarioId == pro.Id && n.Tipo == TipoNotificacion.TurnoCancelado));
        Assert.True(paciente.EstaEliminado);
    }

    [Fact]
    public async Task Al_eliminar_la_cuenta_se_borran_las_notificaciones_del_usuario()
    {
        var pro = await _e.ProfesionalAsync();
        var paciente = await _e.PacienteAsync("Ana Pérez");
        await _e.Turnos.ReservarAsync(paciente.Id, EscenarioAgenda.Pedido(pro, "09:00"));
        Assert.Single(_e.Notificaciones.Todas.Where(n => n.UsuarioId == paciente.Id));

        await _e.Cuenta.EliminarCuentaAsync(paciente.Id, ConClave());

        Assert.Empty(_e.Notificaciones.Todas.Where(n => n.UsuarioId == paciente.Id));
    }

    [Fact]
    public async Task Eliminar_la_cuenta_de_un_profesional_borra_su_perfil_agenda_y_verificaciones()
    {
        var pro = await _e.ProfesionalAsync();
        var paciente = await _e.PacienteAsync("Ana Pérez");
        await _e.PrestacionesServicio.CrearAsync(pro.Id, new GuardarPrestacionRequest("Evaluación", 60));
        await _e.Agenda.CrearAusenciaAsync(pro.Id, new SaludDirecta.Application.Agenda.CrearAusenciaRequest(
            "2026-12-01", "2026-12-05", "Vacaciones"));
        await _e.Turnos.ReservarAsync(paciente.Id, EscenarioAgenda.Pedido(pro, "09:00"));

        var resultado = await _e.Cuenta.EliminarCuentaAsync(pro.Id, ConClave());

        Assert.Equal(1, resultado.TurnosCancelados);
        Assert.Empty(_e.Perfiles.Perfiles.Where(p => p.UsuarioId == pro.Id));
        Assert.Empty(_e.Perfiles.Historial.Where(h => h.UsuarioId == pro.Id));
        Assert.Empty(_e.AgendaRepo.Franjas.Where(f => f.UsuarioId == pro.Id));
        Assert.Empty(_e.AgendaRepo.Configuraciones.Where(c => c.UsuarioId == pro.Id));
        Assert.Empty(_e.AgendaRepo.Ausencias.Where(a => a.UsuarioId == pro.Id));
        Assert.True(_e.Prestaciones.Todas.Where(p => p.UsuarioId == pro.Id).All(p => !p.Activa));
        Assert.Equal("Usuario eliminado", pro.Nombre);
        Assert.Equal("Eliminada", pro.Matricula);

        // El paciente es avisado de que su turno se canceló.
        Assert.Single(_e.Notificaciones.Todas.Where(n => n.UsuarioId == paciente.Id && n.Tipo == TipoNotificacion.TurnoCancelado));
    }

    [Fact]
    public async Task Un_profesional_eliminado_deja_de_aparecer_para_reservar()
    {
        var pro = await _e.ProfesionalAsync();
        await _e.Cuenta.EliminarCuentaAsync(pro.Id, ConClave());

        await Assert.ThrowsAsync<NoEncontradoException>(
            () => _e.Agenda.ObtenerHorariosDisponiblesAsync(pro.Id, EscenarioAgenda.LunesProximo, null));
    }

    [Fact]
    public async Task La_bitacora_registra_la_eliminacion_sin_datos_personales()
    {
        var pro = await _e.ProfesionalAsync();
        var paciente = await _e.PacienteAsync("Ana Pérez");
        await _e.Turnos.ReservarAsync(paciente.Id, EscenarioAgenda.Pedido(pro, "09:00"));
        var correo = paciente.Email;

        await _e.Cuenta.EliminarCuentaAsync(paciente.Id, ConClave());

        var evento = Assert.Single(_e.CuentasRepo.Auditoria);
        Assert.Equal("ELIMINACION_CUENTA", evento.Accion);
        Assert.Equal(paciente.Id, evento.UsuarioId!.Value);
        Assert.False(evento.Detalle.Contains("Ana"));
        Assert.False(evento.Detalle.Contains(correo));
        Assert.True(evento.Detalle.Contains("1")); // turnos cancelados
    }

    [Fact]
    public async Task Con_la_cuenta_eliminada_el_token_viejo_deja_de_servir()
    {
        var pro = await _e.ProfesionalAsync();
        var paciente = await _e.PacienteAsync("Ana Pérez");
        await _e.Cuenta.EliminarCuentaAsync(paciente.Id, ConClave());

        await Assert.ThrowsAsync<CredencialesInvalidasException>(() => _e.Turnos.ListarMisTurnosAsync(paciente.Id));
        await Assert.ThrowsAsync<CredencialesInvalidasException>(
            () => _e.Turnos.ReservarAsync(paciente.Id, EscenarioAgenda.Pedido(pro, "09:00")));
        await Assert.ThrowsAsync<CredencialesInvalidasException>(() => _e.Cuenta.ExportarMisDatosAsync(paciente.Id));
    }

    [Fact]
    public async Task No_se_puede_eliminar_dos_veces_la_misma_cuenta()
    {
        var paciente = await _e.PacienteAsync("Ana Pérez");
        await _e.Cuenta.EliminarCuentaAsync(paciente.Id, ConClave());

        await Assert.ThrowsAsync<CredencialesInvalidasException>(() => _e.Cuenta.EliminarCuentaAsync(paciente.Id, ConClave()));
        Assert.Equal(1, _e.CuentasRepo.Llamadas);
    }

    [Fact]
    public async Task El_historial_de_turnos_de_la_otra_persona_muestra_usuario_eliminado()
    {
        var pro = await _e.ProfesionalAsync();
        var paciente = await _e.PacienteAsync("Ana Pérez");
        await _e.Turnos.ReservarAsync(paciente.Id, EscenarioAgenda.Pedido(pro, "09:00"));
        await _e.Cuenta.EliminarCuentaAsync(paciente.Id, ConClave());

        var turnos = await _e.Turnos.ListarMisTurnosAsync(pro.Id);

        var turno = Assert.Single(turnos);
        Assert.Equal("Usuario eliminado", turno.Paciente);
        Assert.Equal("cancelado", turno.Estado);
    }

    [Fact]
    public async Task El_aviso_a_la_otra_parte_no_nombra_a_la_persona_eliminada()
    {
        var pro = await _e.ProfesionalAsync();
        var paciente = await _e.PacienteAsync("Ana Pérez");
        await _e.Turnos.ReservarAsync(paciente.Id, EscenarioAgenda.Pedido(pro, "09:00"));

        await _e.Cuenta.EliminarCuentaAsync(paciente.Id, ConClave());

        var aviso = _e.Notificaciones.Todas.Single(n => n.UsuarioId == pro.Id && n.Tipo == TipoNotificacion.TurnoCancelado);
        Assert.False(aviso.Mensaje.Contains("Ana"));
    }

    [Fact]
    public async Task Si_el_aviso_falla_la_cuenta_igual_queda_eliminada()
    {
        var pro = await _e.ProfesionalAsync();
        var paciente = await _e.PacienteAsync("Ana Pérez");
        await _e.Turnos.ReservarAsync(paciente.Id, EscenarioAgenda.Pedido(pro, "09:00"));
        var servicio = new CuentaService(_e.Usuarios, new HasherFalso(), _e.Perfiles, _e.TurnosRepo, _e.Notificaciones,
            _e.CuentasRepo, [new ObservadorQueFalla()], new RelojFijo(EscenarioAgenda.AhoraUtc));

        var resultado = await servicio.EliminarCuentaAsync(paciente.Id, ConClave());

        Assert.Equal(1, resultado.TurnosCancelados);
        Assert.True(paciente.EstaEliminado);
    }

    [Fact]
    public async Task El_correo_original_queda_libre_para_registrarse_de_nuevo()
    {
        var paciente = await _e.PacienteAsync("Ana Pérez");
        var correo = paciente.Email;

        await _e.Cuenta.EliminarCuentaAsync(paciente.Id, ConClave());

        Assert.False(await _e.Usuarios.ExisteEmailAsync(correo, CancellationToken.None));
        Assert.Null(await _e.Usuarios.ObtenerPorEmailAsync(correo, CancellationToken.None));
    }
}

/// <summary>Reglas de privacidad del sistema (RNF-02 y RNF-04) comprobadas sobre el modelo.</summary>
public class PrivacidadDelModeloTests
{
    private static IEnumerable<Type> Entidades() =>
        typeof(Usuario).Assembly.GetTypes()
            .Where(t => t.Namespace == "SaludDirecta.Domain.Entities" && t.IsClass && !t.IsNested);

    [Fact]
    public void RNF02_ninguna_entidad_guarda_datos_clinicos_ni_diagnosticos()
    {
        string[] prohibidas = ["diagnost", "clinic", "sintoma", "medicacion", "receta", "enfermedad", "patolog", "historiaclinica"];

        var infractores = Entidades()
            .SelectMany(t => t.GetProperties().Select(p => $"{t.Name}.{p.Name}"))
            .Where(nombre => prohibidas.Any(x => nombre.ToLowerInvariant().Contains(x)))
            .ToList();

        Assert.Empty(infractores);
    }

    [Fact]
    public void RNF04_la_bitacora_de_auditoria_no_se_puede_modificar_desde_el_codigo()
    {
        var propiedadesEscribibles = typeof(EventoAuditoria).GetProperties()
            .Where(p => p.SetMethod is not null && p.SetMethod.IsPublic)
            .Select(p => p.Name)
            .ToList();

        Assert.Empty(propiedadesEscribibles);
    }

    [Fact]
    public void RNF04_la_bitacora_no_ofrece_operaciones_para_cambiar_un_evento()
    {
        var metodos = typeof(EventoAuditoria)
            .GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly)
            .Where(m => !m.IsSpecialName)
            .ToList();

        Assert.Empty(metodos);
    }
}
