using SaludDirecta.Application.Common;
using SaludDirecta.Application.Notificaciones;
using SaludDirecta.Application.Turnos;
using SaludDirecta.Domain.Entities;
using SaludDirecta.Domain.Exceptions;

namespace SaludDirecta.Tests;

public class NotificacionDominioTests
{
    private static readonly DateTime Ahora = new(2026, 11, 16, 12, 0, 0, DateTimeKind.Utc);

    private static Notificacion Nueva(DateTime? programada = null) =>
        Notificacion.Crear(Guid.NewGuid(), Guid.NewGuid(), TipoNotificacion.Recordatorio,
            "Recordatorio de turno", "Tenés turno mañana.", programada ?? Ahora, Ahora);

    [Fact]
    public void Una_notificacion_nueva_esta_pendiente_y_sin_leer()
    {
        var n = Nueva();

        Assert.Equal(EstadoNotificacion.Pendiente, n.Estado);
        Assert.Equal(0, n.Intentos);
        Assert.Null(n.LeidaEn);
        Assert.Null(n.EnviadaEn);
    }

    [Theory]
    [InlineData("", "mensaje")]
    [InlineData("   ", "mensaje")]
    [InlineData("asunto", "")]
    public void El_asunto_y_el_mensaje_son_obligatorios(string asunto, string mensaje)
    {
        Assert.Throws<DominioException>(() =>
            Notificacion.Crear(Guid.NewGuid(), Guid.NewGuid(), TipoNotificacion.Recordatorio, asunto, mensaje, Ahora, Ahora));
    }

    [Fact]
    public void El_asunto_y_el_mensaje_tienen_un_largo_maximo()
    {
        Assert.Throws<DominioException>(() =>
            Notificacion.Crear(Guid.NewGuid(), Guid.NewGuid(), TipoNotificacion.Recordatorio, new string('a', 151), "ok", Ahora, Ahora));
        Assert.Throws<DominioException>(() =>
            Notificacion.Crear(Guid.NewGuid(), Guid.NewGuid(), TipoNotificacion.Recordatorio, "ok", new string('a', 1001), Ahora, Ahora));
    }

    [Fact]
    public void Solo_se_envia_cuando_llega_su_momento()
    {
        var n = Nueva(programada: Ahora.AddHours(2));

        Assert.False(n.DebeEnviarse(Ahora));
        Assert.True(n.DebeEnviarse(Ahora.AddHours(2)));
        Assert.True(n.DebeEnviarse(Ahora.AddHours(3)));
    }

    [Fact]
    public void Una_notificacion_enviada_no_se_vuelve_a_enviar_ni_se_cancela()
    {
        var n = Nueva();

        n.RegistrarEnvio(Ahora);
        n.Cancelar();

        Assert.Equal(EstadoNotificacion.Enviada, n.Estado);
        Assert.False(n.DebeEnviarse(Ahora.AddDays(1)));
    }

    [Fact]
    public void Tras_tres_fallos_la_notificacion_queda_fallida()
    {
        var n = Nueva();

        n.RegistrarFallo();
        n.RegistrarFallo();
        Assert.Equal(EstadoNotificacion.Pendiente, n.Estado);

        n.RegistrarFallo();
        Assert.Equal(EstadoNotificacion.Fallida, n.Estado);
        Assert.Equal(3, n.Intentos);
        Assert.False(n.DebeEnviarse(Ahora));
    }

    [Fact]
    public void Marcar_leida_guarda_el_primer_momento()
    {
        var n = Nueva();

        n.MarcarLeida(Ahora);
        n.MarcarLeida(Ahora.AddHours(5));

        Assert.Equal(Ahora, n.LeidaEn!.Value);
    }
}

public class NotificacionesDeTurnoTests
{
    private readonly EscenarioAgenda _e = new();

    // El lunes 23/11/2026 a las 09:00 hora de Argentina son las 12:00 UTC.
    private static readonly DateTime RecordatorioDelLunes = new(2026, 11, 22, 12, 0, 0, DateTimeKind.Utc);

    private async Task<(Usuario Pro, Usuario Paciente, TurnoDto Turno)> TurnoSolicitadoAsync(
        string hora = "09:00", string fecha = EscenarioAgenda.LunesProximo)
    {
        var pro = await _e.ProfesionalAsync();
        var paciente = await _e.PacienteAsync("Ana Pérez");
        var turno = await _e.Turnos.ReservarAsync(paciente.Id, EscenarioAgenda.Pedido(pro, hora, fecha));
        return (pro, paciente, turno);
    }

    private List<Notificacion> De(Guid usuarioId, TipoNotificacion tipo) =>
        _e.Notificaciones.Todas.Where(n => n.UsuarioId == usuarioId && n.Tipo == tipo).ToList();

    [Fact]
    public async Task Al_reservar_se_avisa_al_profesional_y_al_paciente()
    {
        var (pro, paciente, turno) = await TurnoSolicitadoAsync();

        var paraElProfesional = Assert.Single(De(pro.Id, TipoNotificacion.TurnoSolicitado));
        var paraElPaciente = Assert.Single(De(paciente.Id, TipoNotificacion.TurnoSolicitado));
        Assert.Equal(2, _e.Notificaciones.Todas.Count);
        Assert.Equal(turno.Id, paraElProfesional.TurnoId);
        Assert.Contains("Ana Pérez", paraElProfesional.Mensaje);
        Assert.Contains("23/11/2026", paraElProfesional.Mensaje);
        Assert.Contains("09:00", paraElProfesional.Mensaje);
        Assert.Contains("Lic. Mateo Gómez", paraElPaciente.Mensaje);
        Assert.Equal(EstadoNotificacion.Pendiente, paraElPaciente.Estado);
    }

    [Fact]
    public async Task Al_confirmar_se_avisa_al_paciente_y_se_programan_los_recordatorios()
    {
        var (pro, paciente, turno) = await TurnoSolicitadoAsync();

        await _e.Turnos.CambiarEstadoAsync(pro.Id, turno.Id, new CambiarEstadoTurnoRequest("confirmado"));

        Assert.Single(De(paciente.Id, TipoNotificacion.TurnoConfirmado));
        var recordatorioPaciente = Assert.Single(De(paciente.Id, TipoNotificacion.Recordatorio));
        var recordatorioProfesional = Assert.Single(De(pro.Id, TipoNotificacion.Recordatorio));
        Assert.Equal(RecordatorioDelLunes, recordatorioPaciente.ProgramadaPara);
        Assert.Equal(RecordatorioDelLunes, recordatorioProfesional.ProgramadaPara);
        Assert.Contains("Lic. Mateo Gómez", recordatorioPaciente.Mensaje);
        Assert.Contains("Ana Pérez", recordatorioProfesional.Mensaje);
    }

    [Fact]
    public async Task Si_el_turno_es_dentro_de_menos_de_un_dia_el_recordatorio_sale_enseguida()
    {
        // Hoy es el lunes 16/11 a las 09:00; el turno es ese mismo día a las 16:00.
        var (pro, paciente, turno) = await TurnoSolicitadoAsync("16:00", "2026-11-16");

        await _e.Turnos.CambiarEstadoAsync(pro.Id, turno.Id, new CambiarEstadoTurnoRequest("confirmado"));

        var recordatorio = Assert.Single(De(paciente.Id, TipoNotificacion.Recordatorio));
        Assert.Equal(EscenarioAgenda.AhoraUtc.UtcDateTime, recordatorio.ProgramadaPara);
    }

    [Fact]
    public async Task Cuando_cancela_el_paciente_se_avisa_al_profesional_y_se_cancelan_los_recordatorios()
    {
        var (pro, paciente, turno) = await TurnoSolicitadoAsync();
        await _e.Turnos.CambiarEstadoAsync(pro.Id, turno.Id, new CambiarEstadoTurnoRequest("confirmado"));

        await _e.Turnos.CambiarEstadoAsync(paciente.Id, turno.Id, new CambiarEstadoTurnoRequest("cancelado"));

        var aviso = Assert.Single(De(pro.Id, TipoNotificacion.TurnoCancelado));
        Assert.Contains("Ana Pérez", aviso.Mensaje);
        Assert.Empty(De(paciente.Id, TipoNotificacion.TurnoCancelado));
        Assert.True(_e.Notificaciones.Todas
            .Where(n => n.Tipo == TipoNotificacion.Recordatorio)
            .All(n => n.Estado == EstadoNotificacion.Cancelada));
    }

    [Fact]
    public async Task Cuando_cancela_el_profesional_se_avisa_al_paciente()
    {
        var (pro, paciente, turno) = await TurnoSolicitadoAsync();

        await _e.Turnos.CambiarEstadoAsync(pro.Id, turno.Id, new CambiarEstadoTurnoRequest("cancelado"));

        var aviso = Assert.Single(De(paciente.Id, TipoNotificacion.TurnoCancelado));
        Assert.Contains("Lic. Mateo Gómez", aviso.Mensaje);
        Assert.Empty(De(pro.Id, TipoNotificacion.TurnoCancelado));
    }

    [Fact]
    public async Task Al_cumplirse_el_turno_se_cancelan_los_recordatorios_que_quedaban()
    {
        var (pro, _, turno) = await TurnoSolicitadoAsync();
        await _e.Turnos.CambiarEstadoAsync(pro.Id, turno.Id, new CambiarEstadoTurnoRequest("confirmado"));

        await _e.Turnos.CambiarEstadoAsync(pro.Id, turno.Id, new CambiarEstadoTurnoRequest("cumplido"));

        Assert.True(_e.Notificaciones.Todas
            .Where(n => n.Tipo == TipoNotificacion.Recordatorio)
            .All(n => n.Estado == EstadoNotificacion.Cancelada));
    }

    [Fact]
    public async Task Un_cambio_de_estado_invalido_no_genera_avisos()
    {
        var (pro, _, turno) = await TurnoSolicitadoAsync();
        var antes = _e.Notificaciones.Todas.Count;

        await Assert.ThrowsAsync<ValidacionException>(
            () => _e.Turnos.CambiarEstadoAsync(pro.Id, turno.Id, new CambiarEstadoTurnoRequest("cumplido")));

        Assert.Equal(antes, _e.Notificaciones.Todas.Count);
    }

    [Fact]
    public async Task Si_el_aviso_falla_el_turno_igual_queda_reservado_y_cambia_de_estado()
    {
        var pro = await _e.ProfesionalAsync();
        var paciente = await _e.PacienteAsync();
        var turnos = new TurnoService(_e.TurnosRepo, _e.Agenda, _e.Usuarios,
            new RelojFijo(EscenarioAgenda.AhoraUtc), [new ObservadorQueFalla()]);

        var reservado = await turnos.ReservarAsync(paciente.Id, EscenarioAgenda.Pedido(pro, "09:00"));
        var confirmado = await turnos.CambiarEstadoAsync(pro.Id, reservado.Id, new CambiarEstadoTurnoRequest("confirmado"));

        Assert.Equal("solicitado", reservado.Estado);
        Assert.Equal("confirmado", confirmado.Estado);
        Assert.Single(_e.TurnosRepo.Todos);
    }
}

public class EnvioNotificacionesTests
{
    private readonly EscenarioAgenda _e = new();
    private static readonly DateTimeOffset ElDiaAnteriorAlTurno = new(2026, 11, 22, 12, 0, 0, TimeSpan.Zero);

    private async Task<(Usuario Pro, Usuario Paciente, TurnoDto Turno)> TurnoSolicitadoAsync()
    {
        var pro = await _e.ProfesionalAsync();
        var paciente = await _e.PacienteAsync("Ana Pérez");
        var turno = await _e.Turnos.ReservarAsync(paciente.Id, EscenarioAgenda.Pedido(pro, "09:00"));
        return (pro, paciente, turno);
    }

    [Fact]
    public async Task Los_avisos_inmediatos_salen_en_la_proxima_vuelta()
    {
        var (pro, paciente, _) = await TurnoSolicitadoAsync();

        var enviadas = await _e.Bandeja.EnviarPendientesAsync();

        Assert.Equal(2, enviadas);
        Assert.Equal(2, _e.Enviador.Enviadas.Count);
        Assert.Contains(_e.Enviador.Enviadas, x => x.Destinatario.Id == pro.Id);
        Assert.Contains(_e.Enviador.Enviadas, x => x.Destinatario.Id == paciente.Id);
        Assert.True(_e.Notificaciones.Todas.All(n => n.Estado == EstadoNotificacion.Enviada && n.EnviadaEn is not null));
    }

    [Fact]
    public async Task Lo_que_ya_se_envio_no_se_envia_dos_veces()
    {
        await TurnoSolicitadoAsync();

        await _e.Bandeja.EnviarPendientesAsync();
        var segunda = await _e.Bandeja.EnviarPendientesAsync();

        Assert.Equal(0, segunda);
        Assert.Equal(2, _e.Enviador.Enviadas.Count);
    }

    [Fact]
    public async Task El_recordatorio_no_sale_antes_de_su_hora_y_si_cuando_llega()
    {
        var (pro, _, turno) = await TurnoSolicitadoAsync();
        await _e.Turnos.CambiarEstadoAsync(pro.Id, turno.Id, new CambiarEstadoTurnoRequest("confirmado"));

        // Hoy salen la solicitud (2) y la confirmación (1); los dos recordatorios esperan.
        var hoy = await _e.Bandeja.EnviarPendientesAsync();
        Assert.Equal(3, hoy);
        Assert.Equal(2, _e.Notificaciones.Todas.Count(n =>
            n.Tipo == TipoNotificacion.Recordatorio && n.Estado == EstadoNotificacion.Pendiente));

        // Un día antes del turno llega la hora de los recordatorios.
        var elDiaAnterior = await _e.EnvioEn(ElDiaAnteriorAlTurno).EnviarPendientesAsync();
        Assert.Equal(2, elDiaAnterior);
        Assert.Equal(2, _e.Enviador.Enviadas.Count(x => x.Notificacion.Tipo == TipoNotificacion.Recordatorio));
    }

    [Fact]
    public async Task Un_recordatorio_cancelado_nunca_se_envia()
    {
        var (pro, paciente, turno) = await TurnoSolicitadoAsync();
        await _e.Turnos.CambiarEstadoAsync(pro.Id, turno.Id, new CambiarEstadoTurnoRequest("confirmado"));
        await _e.Turnos.CambiarEstadoAsync(paciente.Id, turno.Id, new CambiarEstadoTurnoRequest("cancelado"));

        await _e.EnvioEn(ElDiaAnteriorAlTurno).EnviarPendientesAsync();

        Assert.Equal(0, _e.Enviador.Enviadas.Count(x => x.Notificacion.Tipo == TipoNotificacion.Recordatorio));
    }

    [Fact]
    public async Task Si_un_envio_falla_los_demas_salen_y_el_fallido_se_reintenta()
    {
        var (pro, _, _) = await TurnoSolicitadoAsync();
        _e.Enviador.DebeFallar = n => n.UsuarioId == pro.Id;

        var primera = await _e.Bandeja.EnviarPendientesAsync();

        Assert.Equal(1, primera); // salió la del paciente
        var fallida = _e.Notificaciones.Todas.Single(n => n.UsuarioId == pro.Id);
        Assert.Equal(EstadoNotificacion.Pendiente, fallida.Estado);
        Assert.Equal(1, fallida.Intentos);

        // El canal se recupera: en la vuelta siguiente sale.
        _e.Enviador.DebeFallar = _ => false;
        var segunda = await _e.Bandeja.EnviarPendientesAsync();
        Assert.Equal(1, segunda);
        Assert.Equal(EstadoNotificacion.Enviada, fallida.Estado);
    }

    [Fact]
    public async Task Tras_tres_intentos_fallidos_se_deja_de_reintentar()
    {
        var (pro, _, _) = await TurnoSolicitadoAsync();
        _e.Enviador.DebeFallar = n => n.UsuarioId == pro.Id;

        for (var i = 0; i < 5; i++) await _e.Bandeja.EnviarPendientesAsync();

        var fallida = _e.Notificaciones.Todas.Single(n => n.UsuarioId == pro.Id);
        Assert.Equal(EstadoNotificacion.Fallida, fallida.Estado);
        Assert.Equal(3, fallida.Intentos);
    }

    [Fact]
    public async Task Una_notificacion_para_un_usuario_que_ya_no_existe_se_descarta()
    {
        var ahora = EscenarioAgenda.AhoraUtc.UtcDateTime;
        await _e.Notificaciones.AgregarAsync(
            [Notificacion.Crear(Guid.NewGuid(), Guid.NewGuid(), TipoNotificacion.TurnoCancelado, "Turno cancelado", "x", ahora, ahora)],
            CancellationToken.None);

        var enviadas = await _e.Bandeja.EnviarPendientesAsync();

        Assert.Equal(0, enviadas);
        Assert.Equal(EstadoNotificacion.Cancelada, _e.Notificaciones.Todas.Single().Estado);
    }
}

public class BandejaDeNotificacionesTests
{
    private readonly EscenarioAgenda _e = new();

    [Fact]
    public async Task Cada_usuario_ve_solo_sus_notificaciones()
    {
        var pro = await _e.ProfesionalAsync();
        var ana = await _e.PacienteAsync("Ana");
        var luis = await _e.PacienteAsync("Luis");
        await _e.Turnos.ReservarAsync(ana.Id, EscenarioAgenda.Pedido(pro, "09:00"));
        await _e.Turnos.ReservarAsync(luis.Id, EscenarioAgenda.Pedido(pro, "09:45"));

        var deAna = await _e.Bandeja.ListarMisNotificacionesAsync(ana.Id);
        var delProfesional = await _e.Bandeja.ListarMisNotificacionesAsync(pro.Id);

        Assert.Single(deAna);
        Assert.Equal(2, delProfesional.Count);
        Assert.Equal("turno_solicitado", deAna[0].Tipo);
        Assert.Equal("pendiente", deAna[0].Estado);
        Assert.False(deAna[0].Leida);
    }

    [Fact]
    public async Task Los_recordatorios_cancelados_no_aparecen_en_la_bandeja()
    {
        var pro = await _e.ProfesionalAsync();
        var ana = await _e.PacienteAsync("Ana");
        var turno = await _e.Turnos.ReservarAsync(ana.Id, EscenarioAgenda.Pedido(pro, "09:00"));
        await _e.Turnos.CambiarEstadoAsync(pro.Id, turno.Id, new CambiarEstadoTurnoRequest("confirmado"));
        await _e.Turnos.CambiarEstadoAsync(ana.Id, turno.Id, new CambiarEstadoTurnoRequest("cancelado"));

        var deAna = await _e.Bandeja.ListarMisNotificacionesAsync(ana.Id);

        Assert.DoesNotContain(deAna, n => n.Tipo == "recordatorio");
        Assert.Contains(deAna, n => n.Tipo == "turno_confirmado");
    }

    [Fact]
    public async Task Se_puede_marcar_una_notificacion_como_leida()
    {
        var pro = await _e.ProfesionalAsync();
        var ana = await _e.PacienteAsync("Ana");
        await _e.Turnos.ReservarAsync(ana.Id, EscenarioAgenda.Pedido(pro, "09:00"));
        var notificacion = (await _e.Bandeja.ListarMisNotificacionesAsync(ana.Id)).Single();

        var leida = await _e.Bandeja.MarcarLeidaAsync(ana.Id, notificacion.Id);

        Assert.True(leida.Leida);
        Assert.True((await _e.Bandeja.ListarMisNotificacionesAsync(ana.Id)).Single().Leida);
    }

    [Fact]
    public async Task No_se_puede_marcar_la_notificacion_de_otro_ni_una_inexistente()
    {
        var pro = await _e.ProfesionalAsync();
        var ana = await _e.PacienteAsync("Ana");
        var luis = await _e.PacienteAsync("Luis");
        await _e.Turnos.ReservarAsync(ana.Id, EscenarioAgenda.Pedido(pro, "09:00"));
        var deAna = (await _e.Bandeja.ListarMisNotificacionesAsync(ana.Id)).Single();

        await Assert.ThrowsAsync<NoEncontradoException>(() => _e.Bandeja.MarcarLeidaAsync(luis.Id, deAna.Id));
        await Assert.ThrowsAsync<NoEncontradoException>(() => _e.Bandeja.MarcarLeidaAsync(ana.Id, Guid.NewGuid()));
        Assert.False((await _e.Bandeja.ListarMisNotificacionesAsync(ana.Id)).Single().Leida);
    }
}
