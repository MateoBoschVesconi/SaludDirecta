using SaludDirecta.Application.Agenda;
using SaludDirecta.Application.Abstractions;
using SaludDirecta.Application.Common;
using SaludDirecta.Application.Notificaciones;
using SaludDirecta.Application.Perfil;
using SaludDirecta.Application.Turnos;
using SaludDirecta.Domain.Entities;
using SaludDirecta.Domain.Exceptions;

namespace SaludDirecta.Tests;

public class GeneradorHorariosTests
{
    private static readonly Guid Profesional = Guid.NewGuid();
    private static readonly DateOnly Lunes = new(2026, 11, 23); // lunes
    private static readonly DateTime Lejano = new(2000, 1, 1);

    private static FranjaHoraria Franja(int dia, string desde, string hasta) =>
        FranjaHoraria.Crear(Profesional, dia, TimeOnly.Parse(desde), TimeOnly.Parse(hasta));

    private static string Texto(IEnumerable<TimeOnly> horas) => string.Join(",", horas.Select(h => h.ToString("HH:mm")));

    [Fact]
    public void Ofrece_horarios_cada_duracion_dentro_de_la_franja()
    {
        var horas = GeneradorHorarios.Generar(Lunes, [Franja(1, "09:00", "12:00")], [], 45, 0, Lejano, []);

        Assert.Equal("09:00,09:45,10:30,11:15", Texto(horas));
    }

    [Fact]
    public void El_descanso_entre_sesiones_separa_los_turnos()
    {
        var horas = GeneradorHorarios.Generar(Lunes, [Franja(1, "09:00", "12:00")], [], 45, 15, Lejano, []);

        Assert.Equal("09:00,10:00,11:00", Texto(horas));
    }

    [Fact]
    public void No_ofrece_un_turno_que_termina_despues_de_la_franja()
    {
        var horas = GeneradorHorarios.Generar(Lunes, [Franja(1, "09:00", "10:30")], [], 60, 0, Lejano, []);

        Assert.Equal("09:00", Texto(horas));
    }

    [Fact]
    public void Solo_ofrece_horarios_en_los_dias_con_atencion()
    {
        var horas = GeneradorHorarios.Generar(Lunes, [Franja(2, "09:00", "12:00")], [], 45, 0, Lejano, []);

        Assert.Empty(horas);
    }

    [Fact]
    public void Combina_la_franja_de_la_manana_y_la_de_la_tarde()
    {
        var horas = GeneradorHorarios.Generar(
            Lunes, [Franja(1, "16:00", "17:00"), Franja(1, "09:00", "10:00")], [], 30, 0, Lejano, []);

        Assert.Equal("09:00,09:30,16:00,16:30", Texto(horas));
    }

    [Fact]
    public void Una_ausencia_bloquea_todo_el_dia()
    {
        var ausencia = Ausencia.Crear(Profesional, new DateOnly(2026, 11, 20), new DateOnly(2026, 11, 24), "Congreso", DateTime.UtcNow);

        var horas = GeneradorHorarios.Generar(Lunes, [Franja(1, "09:00", "12:00")], [ausencia], 45, 0, Lejano, []);

        Assert.Empty(horas);
    }

    [Fact]
    public void Una_ausencia_no_bloquea_fuera_de_sus_fechas()
    {
        var ausencia = Ausencia.Crear(Profesional, new DateOnly(2026, 11, 24), new DateOnly(2026, 11, 25), "Congreso", DateTime.UtcNow);

        var horas = GeneradorHorarios.Generar(Lunes, [Franja(1, "09:00", "10:00")], [ausencia], 60, 0, Lejano, []);

        Assert.Equal("09:00", Texto(horas));
    }

    [Fact]
    public void No_ofrece_lo_que_se_superpone_con_un_turno_ocupado()
    {
        var ocupado = new Intervalo(new DateTime(2026, 11, 23, 9, 45, 0), new DateTime(2026, 11, 23, 10, 30, 0));

        var horas = GeneradorHorarios.Generar(Lunes, [Franja(1, "09:00", "12:00")], [], 45, 0, Lejano, [ocupado]);

        Assert.Equal("09:00,10:30,11:15", Texto(horas));
    }

    [Fact]
    public void Un_turno_ocupado_bloquea_tambien_los_horarios_que_lo_pisan_con_otra_duracion()
    {
        var ocupado = new Intervalo(new DateTime(2026, 11, 23, 9, 0, 0), new DateTime(2026, 11, 23, 9, 45, 0));

        var horas = GeneradorHorarios.Generar(Lunes, [Franja(1, "09:00", "10:30")], [], 30, 0, Lejano, [ocupado]);

        // Las 09:30 empiezan antes de que termine el turno de 09:00 a 09:45, así que no se ofrecen.
        Assert.Equal("10:00", Texto(horas));
    }

    [Fact]
    public void No_ofrece_horarios_anteriores_al_minimo()
    {
        var minimo = new DateTime(2026, 11, 23, 10, 0, 0);

        var horas = GeneradorHorarios.Generar(Lunes, [Franja(1, "09:00", "12:00")], [], 45, 0, minimo, []);

        Assert.Equal("10:30,11:15", Texto(horas));
    }

    [Fact]
    public void Una_duracion_invalida_no_ofrece_nada()
    {
        Assert.Empty(GeneradorHorarios.Generar(Lunes, [Franja(1, "09:00", "12:00")], [], 0, 0, Lejano, []));
    }
}

public class TurnoDominioTests
{
    private static readonly DateTime Ahora = new(2026, 11, 14, 12, 0, 0, DateTimeKind.Utc);

    private static Turno Nuevo() =>
        Turno.Crear(Guid.NewGuid(), Guid.NewGuid(), null, new DateTime(2026, 11, 23, 9, 0, 0), 45, Ahora);

    [Fact]
    public void Un_turno_nuevo_esta_solicitado_y_ocupa_el_horario()
    {
        var turno = Nuevo();

        Assert.Equal(EstadoTurno.Solicitado, turno.Estado);
        Assert.True(turno.OcupaHorario);
        Assert.Equal(new DateTime(2026, 11, 23, 9, 45, 0), turno.Fin);
    }

    [Fact]
    public void La_duracion_debe_ser_mayor_a_cero()
    {
        Assert.Throws<DominioException>(() =>
            Turno.Crear(Guid.NewGuid(), Guid.NewGuid(), null, new DateTime(2026, 11, 23, 9, 0, 0), 0, Ahora));
    }

    [Theory]
    [InlineData(EstadoTurno.Solicitado, EstadoTurno.Confirmado, true)]
    [InlineData(EstadoTurno.Solicitado, EstadoTurno.Cancelado, true)]
    [InlineData(EstadoTurno.Solicitado, EstadoTurno.Cumplido, false)]
    [InlineData(EstadoTurno.Solicitado, EstadoTurno.Ausente, false)]
    [InlineData(EstadoTurno.Confirmado, EstadoTurno.Cumplido, true)]
    [InlineData(EstadoTurno.Confirmado, EstadoTurno.Ausente, true)]
    [InlineData(EstadoTurno.Confirmado, EstadoTurno.Cancelado, true)]
    [InlineData(EstadoTurno.Confirmado, EstadoTurno.Solicitado, false)]
    [InlineData(EstadoTurno.Cumplido, EstadoTurno.Cancelado, false)]
    [InlineData(EstadoTurno.Cancelado, EstadoTurno.Confirmado, false)]
    [InlineData(EstadoTurno.Ausente, EstadoTurno.Cumplido, false)]
    public void Solo_se_permiten_las_transiciones_validas(EstadoTurno actual, EstadoTurno nuevo, bool permitido)
    {
        Assert.Equal(permitido, Turno.PuedeTransitar(actual, nuevo));
    }

    [Fact]
    public void Una_transicion_invalida_lanza_error_y_no_cambia_el_estado()
    {
        var turno = Nuevo();

        Assert.Throws<DominioException>(() => turno.CambiarEstado(EstadoTurno.Cumplido, Ahora));
        Assert.Equal(EstadoTurno.Solicitado, turno.Estado);
    }

    [Fact]
    public void Cancelar_libera_el_horario()
    {
        var turno = Nuevo();

        turno.CambiarEstado(EstadoTurno.Cancelado, Ahora);

        Assert.False(turno.OcupaHorario);
    }

    [Fact]
    public void Dos_turnos_se_solapan_solo_si_se_pisan()
    {
        var turno = Nuevo(); // 09:00 a 09:45

        Assert.True(turno.Solapa(new DateTime(2026, 11, 23, 9, 30, 0), new DateTime(2026, 11, 23, 10, 0, 0)));
        Assert.False(turno.Solapa(new DateTime(2026, 11, 23, 9, 45, 0), new DateTime(2026, 11, 23, 10, 30, 0)));
        Assert.False(turno.Solapa(new DateTime(2026, 11, 23, 8, 0, 0), new DateTime(2026, 11, 23, 9, 0, 0)));
    }
}

/// <summary>Arma un profesional con perfil publicado y agenda, y pacientes, todo en memoria.</summary>
internal class EscenarioAgenda
{
    // "Ahora" es lunes 16/11/2026 a las 09:00 hora de Argentina (12:00 UTC).
    public static readonly DateTimeOffset AhoraUtc = new(2026, 11, 16, 12, 0, 0, TimeSpan.Zero);
    public const string LunesProximo = "2026-11-23";

    public RepositorioEnMemoria Usuarios { get; } = new();
    public PerfilRepositorioEnMemoria Perfiles { get; } = new();
    public PrestacionRepositorioEnMemoria Prestaciones { get; } = new();
    public VerificacionRepositorioEnMemoria Verificaciones { get; } = new();
    public AgendaRepositorioEnMemoria AgendaRepo { get; } = new();
    public TurnoRepositorioEnMemoria TurnosRepo { get; } = new();
    public NotificacionRepositorioEnMemoria Notificaciones { get; } = new();
    public EnviadorFalso Enviador { get; } = new();

    public PerfilService Perfil { get; }
    public PrestacionService PrestacionesServicio { get; }
    public AgendaService Agenda { get; }
    public TurnoService Turnos { get; }
    public NotificacionService Bandeja { get; }

    public EscenarioAgenda()
    {
        var reloj = new RelojFijo(AhoraUtc);
        Perfil = new PerfilService(Usuarios, Perfiles, Prestaciones, Verificaciones, reloj);
        PrestacionesServicio = new PrestacionService(Prestaciones, reloj);
        Agenda = new AgendaService(AgendaRepo, TurnosRepo, Usuarios, Perfiles, Prestaciones, reloj);
        Turnos = new TurnoService(TurnosRepo, Agenda, Usuarios, reloj,
            [new NotificadorDeTurnos(Notificaciones, Usuarios, reloj)]);
        Bandeja = EnvioEn(AhoraUtc);
    }

    /// <summary>El servicio de notificaciones visto desde otro momento, para probar los envíos programados.</summary>
    public NotificacionService EnvioEn(DateTimeOffset momento) =>
        new(Notificaciones, Usuarios, Enviador, new RelojFijo(momento));

    public async Task<Usuario> ProfesionalAsync(bool publicado = true, int duracion = 45, bool conAgenda = true)
    {
        var usuario = Usuario.Crear(
            "Lic. Mateo Gómez", $"{Guid.NewGuid():N}@ejemplo.com", "3624999999", "hash:x", Rol.Profesional,
            "Kinesiología", "MP 3412", "Chaco", true, DateTime.UtcNow);
        await Usuarios.AgregarAsync(usuario, CancellationToken.None);

        await Perfil.GuardarPerfilAsync(usuario.Id,
            new GuardarPerfilRequest("Rehabilitación", null, "Av. Sarmiento 450", "Resistencia", null,
                duracion, false, false, false));
        if (publicado)
        {
            await Perfil.CambiarHonorarioAsync(usuario.Id, new CambiarHonorarioRequest(25000m));
            await Perfil.PublicarAsync(usuario.Id);
        }

        if (conAgenda)
            await Agenda.GuardarAgendaAsync(usuario.Id, new GuardarAgendaRequest(
                [new FranjaDto(1, "09:00", "12:00"), new FranjaDto(1, "16:00", "18:00")], 0, 0));

        return usuario;
    }

    public async Task<Usuario> PacienteAsync(string nombre = "Ana Pérez")
    {
        var paciente = Usuario.Crear(
            nombre, $"{Guid.NewGuid():N}@ejemplo.com", "3624123456", "hash:x", Rol.Paciente,
            null, null, null, true, DateTime.UtcNow);
        await Usuarios.AgregarAsync(paciente, CancellationToken.None);
        return paciente;
    }

    public static ReservarTurnoRequest Pedido(Usuario profesional, string hora, string fecha = LunesProximo,
        Guid? prestacionId = null) => new(profesional.Id, fecha, hora, prestacionId);
}

public class AgendaServiceTests
{
    private readonly EscenarioAgenda _e = new();

    // ---------- Agenda propia ----------

    [Fact]
    public async Task La_agenda_guardada_se_devuelve_ordenada_con_sus_ajustes()
    {
        var pro = await _e.ProfesionalAsync(conAgenda: false);

        await _e.Agenda.GuardarAgendaAsync(pro.Id, new GuardarAgendaRequest(
            [new FranjaDto(3, "16:00", "20:00"), new FranjaDto(1, "08:30", "12:30")], 15, 4));
        var dto = await _e.Agenda.ObtenerAgendaAsync(pro.Id);

        Assert.Equal(2, dto.Franjas.Count);
        Assert.Equal(1, dto.Franjas[0].DiaSemana);
        Assert.Equal("08:30", dto.Franjas[0].Desde);
        Assert.Equal("20:00", dto.Franjas[1].Hasta);
        Assert.Equal(15, dto.DescansoEntreSesionesMinutos);
        Assert.Equal(4, dto.AnticipacionMinimaHoras);
    }

    [Fact]
    public async Task Guardar_la_agenda_reemplaza_la_anterior()
    {
        var pro = await _e.ProfesionalAsync();

        await _e.Agenda.GuardarAgendaAsync(pro.Id, new GuardarAgendaRequest([new FranjaDto(2, "10:00", "11:00")], 0, 0));
        var dto = await _e.Agenda.ObtenerAgendaAsync(pro.Id);

        var unica = Assert.Single(dto.Franjas);
        Assert.Equal(2, unica.DiaSemana);
    }

    [Fact]
    public async Task Sin_agenda_cargada_se_devuelve_una_vacia()
    {
        var pro = await _e.ProfesionalAsync(conAgenda: false);

        var dto = await _e.Agenda.ObtenerAgendaAsync(pro.Id);

        Assert.Empty(dto.Franjas);
        Assert.Equal(0, dto.DescansoEntreSesionesMinutos);
    }

    [Fact]
    public async Task Franjas_que_se_superponen_en_el_mismo_dia_se_rechazan()
    {
        var pro = await _e.ProfesionalAsync(conAgenda: false);

        await Assert.ThrowsAsync<ValidacionException>(() => _e.Agenda.GuardarAgendaAsync(pro.Id,
            new GuardarAgendaRequest([new FranjaDto(1, "09:00", "12:00"), new FranjaDto(1, "11:00", "14:00")], 0, 0)));
        Assert.Empty(_e.AgendaRepo.Franjas);
    }

    [Fact]
    public async Task Franjas_contiguas_en_el_mismo_dia_se_aceptan()
    {
        var pro = await _e.ProfesionalAsync(conAgenda: false);

        var dto = await _e.Agenda.GuardarAgendaAsync(pro.Id,
            new GuardarAgendaRequest([new FranjaDto(1, "09:00", "12:00"), new FranjaDto(1, "12:00", "14:00")], 0, 0));

        Assert.Equal(2, dto.Franjas.Count);
    }

    [Theory]
    [InlineData("9", "12:00")]
    [InlineData("09:00", "25:00")]
    [InlineData("", "12:00")]
    public async Task Las_horas_deben_tener_formato_HH_mm(string desde, string hasta)
    {
        var pro = await _e.ProfesionalAsync(conAgenda: false);

        await Assert.ThrowsAsync<ValidacionException>(() => _e.Agenda.GuardarAgendaAsync(pro.Id,
            new GuardarAgendaRequest([new FranjaDto(1, desde, hasta)], 0, 0)));
    }

    [Fact]
    public async Task Una_franja_invertida_o_con_dia_invalido_se_rechaza()
    {
        var pro = await _e.ProfesionalAsync(conAgenda: false);

        await Assert.ThrowsAsync<ValidacionException>(() => _e.Agenda.GuardarAgendaAsync(pro.Id,
            new GuardarAgendaRequest([new FranjaDto(1, "12:00", "09:00")], 0, 0)));
        await Assert.ThrowsAsync<ValidacionException>(() => _e.Agenda.GuardarAgendaAsync(pro.Id,
            new GuardarAgendaRequest([new FranjaDto(7, "09:00", "12:00")], 0, 0)));
    }

    [Fact]
    public async Task Los_ajustes_fuera_de_rango_se_rechazan()
    {
        var pro = await _e.ProfesionalAsync(conAgenda: false);

        await Assert.ThrowsAsync<ValidacionException>(() => _e.Agenda.GuardarAgendaAsync(pro.Id,
            new GuardarAgendaRequest([], -1, 0)));
        await Assert.ThrowsAsync<ValidacionException>(() => _e.Agenda.GuardarAgendaAsync(pro.Id,
            new GuardarAgendaRequest([], 0, 9999)));
    }

    [Fact]
    public async Task Un_paciente_no_tiene_agenda()
    {
        var paciente = await _e.PacienteAsync();

        await Assert.ThrowsAsync<ValidacionException>(() => _e.Agenda.ObtenerAgendaAsync(paciente.Id));
    }

    // ---------- Ausencias ----------

    [Fact]
    public async Task Se_puede_crear_listar_y_eliminar_una_ausencia()
    {
        var pro = await _e.ProfesionalAsync();

        var creada = await _e.Agenda.CrearAusenciaAsync(pro.Id,
            new CrearAusenciaRequest("2026-11-20", "2026-11-23", "Congreso de Kinesiología"));
        var lista = await _e.Agenda.ListarAusenciasAsync(pro.Id);

        var unica = Assert.Single(lista);
        Assert.Equal(creada.Id, unica.Id);
        Assert.Equal("2026-11-20", unica.Desde);
        Assert.Equal("Congreso de Kinesiología", unica.Motivo);

        await _e.Agenda.EliminarAusenciaAsync(pro.Id, creada.Id);
        Assert.Empty(await _e.Agenda.ListarAusenciasAsync(pro.Id));
    }

    [Fact]
    public async Task Las_ausencias_invalidas_se_rechazan()
    {
        var pro = await _e.ProfesionalAsync();

        await Assert.ThrowsAsync<ValidacionException>(() => _e.Agenda.CrearAusenciaAsync(pro.Id,
            new CrearAusenciaRequest("2026-11-25", "2026-11-20", "Vacaciones")));
        await Assert.ThrowsAsync<ValidacionException>(() => _e.Agenda.CrearAusenciaAsync(pro.Id,
            new CrearAusenciaRequest("2026-11-20", "2026-11-25", "  ")));
        await Assert.ThrowsAsync<ValidacionException>(() => _e.Agenda.CrearAusenciaAsync(pro.Id,
            new CrearAusenciaRequest("20/11/2026", "2026-11-25", "Vacaciones")));
        Assert.Empty(_e.AgendaRepo.Ausencias);
    }

    [Fact]
    public async Task No_se_puede_eliminar_la_ausencia_de_otro_profesional()
    {
        var titular = await _e.ProfesionalAsync();
        var otro = await _e.ProfesionalAsync();
        var ausencia = await _e.Agenda.CrearAusenciaAsync(titular.Id,
            new CrearAusenciaRequest("2026-11-20", "2026-11-23", "Congreso"));

        await Assert.ThrowsAsync<NoEncontradoException>(() => _e.Agenda.EliminarAusenciaAsync(otro.Id, ausencia.Id));
        Assert.Single(await _e.Agenda.ListarAusenciasAsync(titular.Id));
    }

    // ---------- Horarios disponibles ----------

    [Fact]
    public async Task Los_horarios_disponibles_siguen_la_agenda_y_la_duracion_de_la_sesion()
    {
        var pro = await _e.ProfesionalAsync(duracion: 45);

        var dto = await _e.Agenda.ObtenerHorariosDisponiblesAsync(pro.Id, EscenarioAgenda.LunesProximo, null);

        Assert.Equal(45, dto.DuracionMinutos);
        Assert.Equal("09:00,09:45,10:30,11:15,16:00,16:45", string.Join(",", dto.Horarios));
    }

    [Fact]
    public async Task La_duracion_se_ajusta_a_la_prestacion_elegida()
    {
        var pro = await _e.ProfesionalAsync(duracion: 45);
        var prestacion = await _e.PrestacionesServicio.CrearAsync(pro.Id, new GuardarPrestacionRequest("Evaluación", 60));

        var dto = await _e.Agenda.ObtenerHorariosDisponiblesAsync(pro.Id, EscenarioAgenda.LunesProximo, prestacion.Id);

        Assert.Equal(60, dto.DuracionMinutos);
        Assert.Equal("09:00,10:00,11:00,16:00,17:00", string.Join(",", dto.Horarios));
    }

    [Fact]
    public async Task Una_prestacion_de_otro_profesional_no_existe()
    {
        var pro = await _e.ProfesionalAsync();
        var otro = await _e.ProfesionalAsync();
        var ajena = await _e.PrestacionesServicio.CrearAsync(otro.Id, new GuardarPrestacionRequest("Evaluación", 60));

        await Assert.ThrowsAsync<NoEncontradoException>(
            () => _e.Agenda.ObtenerHorariosDisponiblesAsync(pro.Id, EscenarioAgenda.LunesProximo, ajena.Id));
    }

    [Fact]
    public async Task Los_periodos_de_ausencia_bloquean_los_horarios()
    {
        var pro = await _e.ProfesionalAsync();
        await _e.Agenda.CrearAusenciaAsync(pro.Id, new CrearAusenciaRequest("2026-11-20", "2026-11-24", "Congreso"));

        var dto = await _e.Agenda.ObtenerHorariosDisponiblesAsync(pro.Id, EscenarioAgenda.LunesProximo, null);

        Assert.Empty(dto.Horarios);
    }

    [Fact]
    public async Task El_aviso_minimo_oculta_los_horarios_demasiado_cercanos()
    {
        var pro = await _e.ProfesionalAsync(duracion: 45, conAgenda: false);
        // Hoy es lunes 16/11 a las 09:00. Con 4 horas de aviso, lo primero que se ofrece es desde las 13:00.
        await _e.Agenda.GuardarAgendaAsync(pro.Id, new GuardarAgendaRequest(
            [new FranjaDto(1, "09:00", "12:00"), new FranjaDto(1, "16:00", "17:00")], 0, 4));

        var dto = await _e.Agenda.ObtenerHorariosDisponiblesAsync(pro.Id, "2026-11-16", null);

        Assert.Equal("16:00", string.Join(",", dto.Horarios));
    }

    [Fact]
    public async Task Los_horarios_pasados_no_se_ofrecen()
    {
        var pro = await _e.ProfesionalAsync(duracion: 45);

        var dto = await _e.Agenda.ObtenerHorariosDisponiblesAsync(pro.Id, "2026-11-09", null);

        Assert.Empty(dto.Horarios);
    }

    [Fact]
    public async Task Un_profesional_sin_perfil_publicado_no_ofrece_horarios()
    {
        var pro = await _e.ProfesionalAsync(publicado: false);

        await Assert.ThrowsAsync<NoEncontradoException>(
            () => _e.Agenda.ObtenerHorariosDisponiblesAsync(pro.Id, EscenarioAgenda.LunesProximo, null));
    }

    [Fact]
    public async Task La_fecha_debe_tener_formato_yyyy_MM_dd()
    {
        var pro = await _e.ProfesionalAsync();

        await Assert.ThrowsAsync<ValidacionException>(
            () => _e.Agenda.ObtenerHorariosDisponiblesAsync(pro.Id, "23/11/2026", null));
        await Assert.ThrowsAsync<ValidacionException>(
            () => _e.Agenda.ObtenerHorariosDisponiblesAsync(pro.Id, null, null));
    }
}

public class TurnoServiceTests
{
    private readonly EscenarioAgenda _e = new();

    [Fact]
    public async Task Reservar_crea_un_turno_solicitado_con_los_datos_correctos()
    {
        var pro = await _e.ProfesionalAsync(duracion: 45);
        var paciente = await _e.PacienteAsync("Ana Pérez");

        var dto = await _e.Turnos.ReservarAsync(paciente.Id, EscenarioAgenda.Pedido(pro, "09:45"));

        Assert.Equal("solicitado", dto.Estado);
        Assert.Equal("2026-11-23", dto.Fecha);
        Assert.Equal("09:45", dto.Hora);
        Assert.Equal("10:30", dto.HoraFin);
        Assert.Equal(45, dto.DuracionMinutos);
        Assert.Equal("Ana Pérez", dto.Paciente);
        Assert.Equal("Lic. Mateo Gómez", dto.Profesional);
        Assert.Single(_e.TurnosRepo.Todos);
    }

    [Fact]
    public async Task El_turno_toma_la_duracion_de_la_prestacion()
    {
        var pro = await _e.ProfesionalAsync(duracion: 45);
        var paciente = await _e.PacienteAsync();
        var prestacion = await _e.PrestacionesServicio.CrearAsync(pro.Id, new GuardarPrestacionRequest("Evaluación", 60));

        var dto = await _e.Turnos.ReservarAsync(paciente.Id, EscenarioAgenda.Pedido(pro, "10:00", prestacionId: prestacion.Id));

        Assert.Equal(60, dto.DuracionMinutos);
        Assert.Equal("11:00", dto.HoraFin);
        Assert.Equal(prestacion.Id, dto.PrestacionId);
    }

    [Fact]
    public async Task Un_horario_ya_reservado_responde_ocupado()
    {
        var pro = await _e.ProfesionalAsync();
        var primero = await _e.PacienteAsync("Ana");
        var segundo = await _e.PacienteAsync("Luis");
        await _e.Turnos.ReservarAsync(primero.Id, EscenarioAgenda.Pedido(pro, "09:00"));

        await Assert.ThrowsAsync<TurnoOcupadoException>(
            () => _e.Turnos.ReservarAsync(segundo.Id, EscenarioAgenda.Pedido(pro, "09:00")));
        Assert.Single(_e.TurnosRepo.Todos);
    }

    [Fact]
    public async Task Un_horario_que_se_superpone_con_otro_turno_responde_ocupado()
    {
        var pro = await _e.ProfesionalAsync(duracion: 45);
        var primero = await _e.PacienteAsync("Ana");
        var segundo = await _e.PacienteAsync("Luis");
        var corta = await _e.PrestacionesServicio.CrearAsync(pro.Id, new GuardarPrestacionRequest("Control", 30));
        await _e.Turnos.ReservarAsync(primero.Id, EscenarioAgenda.Pedido(pro, "09:00")); // 09:00 a 09:45

        // Con una prestación de 30 minutos, las 09:30 son un horario posible, pero pisa el turno anterior.
        await Assert.ThrowsAsync<TurnoOcupadoException>(
            () => _e.Turnos.ReservarAsync(segundo.Id, EscenarioAgenda.Pedido(pro, "09:30", prestacionId: corta.Id)));
    }

    [Fact]
    public async Task Cancelar_un_turno_libera_el_horario()
    {
        var pro = await _e.ProfesionalAsync();
        var primero = await _e.PacienteAsync("Ana");
        var segundo = await _e.PacienteAsync("Luis");
        var turno = await _e.Turnos.ReservarAsync(primero.Id, EscenarioAgenda.Pedido(pro, "09:00"));

        await _e.Turnos.CambiarEstadoAsync(primero.Id, turno.Id, new CambiarEstadoTurnoRequest("cancelado"));
        var nuevo = await _e.Turnos.ReservarAsync(segundo.Id, EscenarioAgenda.Pedido(pro, "09:00"));

        Assert.Equal("solicitado", nuevo.Estado);
        Assert.Equal(2, _e.TurnosRepo.Todos.Count);
    }

    [Fact]
    public async Task Un_horario_fuera_de_la_agenda_se_rechaza()
    {
        var pro = await _e.ProfesionalAsync();
        var paciente = await _e.PacienteAsync();

        await Assert.ThrowsAsync<ValidacionException>(
            () => _e.Turnos.ReservarAsync(paciente.Id, EscenarioAgenda.Pedido(pro, "13:00")));  // sin atención a esa hora
        await Assert.ThrowsAsync<ValidacionException>(
            () => _e.Turnos.ReservarAsync(paciente.Id, EscenarioAgenda.Pedido(pro, "09:10")));  // no es un horario de la grilla
        await Assert.ThrowsAsync<ValidacionException>(
            () => _e.Turnos.ReservarAsync(paciente.Id, EscenarioAgenda.Pedido(pro, "09:00", fecha: "2026-11-24"))); // martes
        Assert.Empty(_e.TurnosRepo.Todos);
    }

    [Fact]
    public async Task No_se_puede_reservar_en_un_periodo_de_ausencia()
    {
        var pro = await _e.ProfesionalAsync();
        var paciente = await _e.PacienteAsync();
        await _e.Agenda.CrearAusenciaAsync(pro.Id, new CrearAusenciaRequest("2026-11-20", "2026-11-24", "Congreso"));

        await Assert.ThrowsAsync<ValidacionException>(
            () => _e.Turnos.ReservarAsync(paciente.Id, EscenarioAgenda.Pedido(pro, "09:00")));
    }

    [Fact]
    public async Task No_se_puede_reservar_en_el_pasado()
    {
        var pro = await _e.ProfesionalAsync();
        var paciente = await _e.PacienteAsync();

        await Assert.ThrowsAsync<ValidacionException>(
            () => _e.Turnos.ReservarAsync(paciente.Id, EscenarioAgenda.Pedido(pro, "09:00", fecha: "2026-11-09")));
    }

    [Fact]
    public async Task No_se_puede_reservar_con_un_profesional_sin_perfil_publicado()
    {
        var pro = await _e.ProfesionalAsync(publicado: false);
        var paciente = await _e.PacienteAsync();

        await Assert.ThrowsAsync<NoEncontradoException>(
            () => _e.Turnos.ReservarAsync(paciente.Id, EscenarioAgenda.Pedido(pro, "09:00")));
    }

    [Fact]
    public async Task Un_profesional_no_puede_reservar_turnos()
    {
        var pro = await _e.ProfesionalAsync();
        var otro = await _e.ProfesionalAsync();

        await Assert.ThrowsAsync<ValidacionException>(
            () => _e.Turnos.ReservarAsync(otro.Id, EscenarioAgenda.Pedido(pro, "09:00")));
    }

    [Fact]
    public async Task Los_datos_de_la_reserva_deben_ser_validos()
    {
        var pro = await _e.ProfesionalAsync();
        var paciente = await _e.PacienteAsync();

        await Assert.ThrowsAsync<ValidacionException>(
            () => _e.Turnos.ReservarAsync(paciente.Id, new ReservarTurnoRequest(pro.Id, null, "09:00", null)));
        await Assert.ThrowsAsync<ValidacionException>(
            () => _e.Turnos.ReservarAsync(paciente.Id, new ReservarTurnoRequest(pro.Id, "2026-11-23", "9am", null)));
        await Assert.ThrowsAsync<CredencialesInvalidasException>(
            () => _e.Turnos.ReservarAsync(Guid.NewGuid(), EscenarioAgenda.Pedido(pro, "09:00")));
    }

    // ---------- Estados ----------

    [Fact]
    public async Task El_turno_recorre_los_estados_validos()
    {
        var pro = await _e.ProfesionalAsync();
        var paciente = await _e.PacienteAsync();
        var turno = await _e.Turnos.ReservarAsync(paciente.Id, EscenarioAgenda.Pedido(pro, "09:00"));

        var confirmado = await _e.Turnos.CambiarEstadoAsync(pro.Id, turno.Id, new CambiarEstadoTurnoRequest("confirmado"));
        var cumplido = await _e.Turnos.CambiarEstadoAsync(pro.Id, turno.Id, new CambiarEstadoTurnoRequest("Cumplido"));

        Assert.Equal("confirmado", confirmado.Estado);
        Assert.Equal("cumplido", cumplido.Estado);
    }

    [Fact]
    public async Task Una_transicion_invalida_se_rechaza()
    {
        var pro = await _e.ProfesionalAsync();
        var paciente = await _e.PacienteAsync();
        var turno = await _e.Turnos.ReservarAsync(paciente.Id, EscenarioAgenda.Pedido(pro, "09:00"));

        // solicitado no puede pasar directo a cumplido ni a ausente
        await Assert.ThrowsAsync<ValidacionException>(
            () => _e.Turnos.CambiarEstadoAsync(pro.Id, turno.Id, new CambiarEstadoTurnoRequest("cumplido")));
        await Assert.ThrowsAsync<ValidacionException>(
            () => _e.Turnos.CambiarEstadoAsync(pro.Id, turno.Id, new CambiarEstadoTurnoRequest("ausente")));
        Assert.Equal(EstadoTurno.Solicitado, _e.TurnosRepo.Todos[0].Estado);
    }

    [Fact]
    public async Task Los_estados_finales_no_cambian()
    {
        var pro = await _e.ProfesionalAsync();
        var paciente = await _e.PacienteAsync();
        var turno = await _e.Turnos.ReservarAsync(paciente.Id, EscenarioAgenda.Pedido(pro, "09:00"));
        await _e.Turnos.CambiarEstadoAsync(pro.Id, turno.Id, new CambiarEstadoTurnoRequest("cancelado"));

        await Assert.ThrowsAsync<ValidacionException>(
            () => _e.Turnos.CambiarEstadoAsync(pro.Id, turno.Id, new CambiarEstadoTurnoRequest("confirmado")));
    }

    [Theory]
    [InlineData("")]
    [InlineData("pendiente")]
    [InlineData("solicitado")]
    [InlineData("99")]
    public async Task Un_estado_desconocido_o_inicial_se_rechaza(string estado)
    {
        var pro = await _e.ProfesionalAsync();
        var paciente = await _e.PacienteAsync();
        var turno = await _e.Turnos.ReservarAsync(paciente.Id, EscenarioAgenda.Pedido(pro, "09:00"));

        await Assert.ThrowsAsync<ValidacionException>(
            () => _e.Turnos.CambiarEstadoAsync(pro.Id, turno.Id, new CambiarEstadoTurnoRequest(estado)));
    }

    [Fact]
    public async Task El_paciente_solo_puede_cancelar()
    {
        var pro = await _e.ProfesionalAsync();
        var paciente = await _e.PacienteAsync();
        var turno = await _e.Turnos.ReservarAsync(paciente.Id, EscenarioAgenda.Pedido(pro, "09:00"));

        await Assert.ThrowsAsync<ValidacionException>(
            () => _e.Turnos.CambiarEstadoAsync(paciente.Id, turno.Id, new CambiarEstadoTurnoRequest("confirmado")));
        var cancelado = await _e.Turnos.CambiarEstadoAsync(paciente.Id, turno.Id, new CambiarEstadoTurnoRequest("cancelado"));

        Assert.Equal("cancelado", cancelado.Estado);
    }

    // ---------- Consulta ----------

    [Fact]
    public async Task El_paciente_y_el_profesional_consultan_el_estado_del_turno()
    {
        var pro = await _e.ProfesionalAsync();
        var paciente = await _e.PacienteAsync();
        var turno = await _e.Turnos.ReservarAsync(paciente.Id, EscenarioAgenda.Pedido(pro, "09:00"));

        var delPaciente = await _e.Turnos.ObtenerAsync(paciente.Id, turno.Id);
        var delProfesional = await _e.Turnos.ObtenerAsync(pro.Id, turno.Id);

        Assert.Equal("solicitado", delPaciente.Estado);
        Assert.Equal(turno.Id, delProfesional.Id);
    }

    [Fact]
    public async Task Un_tercero_no_puede_ver_ni_cambiar_el_turno()
    {
        var pro = await _e.ProfesionalAsync();
        var paciente = await _e.PacienteAsync();
        var intruso = await _e.PacienteAsync("Otro Paciente");
        var turno = await _e.Turnos.ReservarAsync(paciente.Id, EscenarioAgenda.Pedido(pro, "09:00"));

        await Assert.ThrowsAsync<NoEncontradoException>(() => _e.Turnos.ObtenerAsync(intruso.Id, turno.Id));
        await Assert.ThrowsAsync<NoEncontradoException>(
            () => _e.Turnos.CambiarEstadoAsync(intruso.Id, turno.Id, new CambiarEstadoTurnoRequest("cancelado")));
        await Assert.ThrowsAsync<NoEncontradoException>(() => _e.Turnos.ObtenerAsync(paciente.Id, Guid.NewGuid()));
    }

    [Fact]
    public async Task Cada_uno_lista_sus_turnos_ordenados_por_fecha()
    {
        var pro = await _e.ProfesionalAsync();
        var ana = await _e.PacienteAsync("Ana");
        var luis = await _e.PacienteAsync("Luis");
        await _e.Turnos.ReservarAsync(ana.Id, EscenarioAgenda.Pedido(pro, "10:30"));
        await _e.Turnos.ReservarAsync(ana.Id, EscenarioAgenda.Pedido(pro, "09:00"));
        await _e.Turnos.ReservarAsync(luis.Id, EscenarioAgenda.Pedido(pro, "09:45"));

        var deAna = await _e.Turnos.ListarMisTurnosAsync(ana.Id);
        var delProfesional = await _e.Turnos.ListarMisTurnosAsync(pro.Id);

        Assert.Equal("09:00,10:30", string.Join(",", deAna.Select(t => t.Hora)));
        Assert.Equal(3, delProfesional.Count);
        Assert.Equal("09:00,09:45,10:30", string.Join(",", delProfesional.Select(t => t.Hora)));
    }

    // ---------- Concurrencia (criterio 1 y 4 de la HU9) ----------

    [Fact]
    public async Task Cien_solicitudes_simultaneas_para_el_mismo_horario_dejan_un_solo_turno()
    {
        var pro = await _e.ProfesionalAsync();
        var pacientes = new List<Usuario>();
        for (var i = 0; i < 100; i++) pacientes.Add(await _e.PacienteAsync($"Paciente {i}"));

        var intentos = pacientes
            .Select(p => Task.Run(async () =>
            {
                try
                {
                    await _e.Turnos.ReservarAsync(p.Id, EscenarioAgenda.Pedido(pro, "09:00"));
                    return "ok";
                }
                catch (TurnoOcupadoException)
                {
                    return "ocupado";
                }
            }))
            .ToList();
        var resultados = await Task.WhenAll(intentos);

        Assert.Equal(1, resultados.Count(r => r == "ok"));
        Assert.Equal(99, resultados.Count(r => r == "ocupado"));
        Assert.Single(_e.TurnosRepo.Todos);
    }
}
