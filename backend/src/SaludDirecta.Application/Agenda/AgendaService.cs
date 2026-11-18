using System.Globalization;
using SaludDirecta.Application.Abstractions;
using SaludDirecta.Application.Common;
using SaludDirecta.Domain.Entities;

namespace SaludDirecta.Application.Agenda;

/// <summary>HU8: disponibilidad horaria, descanso, aviso mínimo, ausencias y horarios que se ofrecen a los pacientes.</summary>
public sealed class AgendaService(
    IAgendaRepository agenda,
    ITurnoRepository turnos,
    IUsuarioRepository usuarios,
    IPerfilRepository perfiles,
    IPrestacionRepository prestaciones,
    TimeProvider reloj)
{
    public const string FormatoHora = "HH:mm";
    public const string FormatoFecha = "yyyy-MM-dd";

    // ---------- Agenda propia del profesional ----------

    public async Task<AgendaDto> ObtenerAgendaAsync(Guid usuarioId, CancellationToken ct = default)
    {
        await ExigirProfesionalAsync(usuarioId, ct);
        var franjas = await agenda.ObtenerFranjasAsync(usuarioId, ct);
        var config = await agenda.ObtenerConfiguracionAsync(usuarioId, ct);
        return ADto(franjas, config);
    }

    /// <summary>Reemplaza toda la disponibilidad semanal y los ajustes de la agenda.</summary>
    public async Task<AgendaDto> GuardarAgendaAsync(
        Guid usuarioId, GuardarAgendaRequest pedido, CancellationToken ct = default)
    {
        await ExigirProfesionalAsync(usuarioId, ct);

        if (pedido.Franjas is null)
            throw new ValidacionException("Faltan las franjas horarias.");

        var franjas = new List<FranjaHoraria>();
        foreach (var f in pedido.Franjas)
        {
            var desde = LeerHora(f.Desde);
            var hasta = LeerHora(f.Hasta);
            franjas.Add(ReglasDominio.Ejecutar(() => FranjaHoraria.Crear(usuarioId, f.DiaSemana, desde, hasta)));
        }

        // Dos franjas del mismo día no pueden pisarse (se permite que una termine justo cuando empieza la otra).
        foreach (var dia in franjas.GroupBy(f => f.DiaSemana))
        {
            var ordenadas = dia.OrderBy(f => f.Desde).ToList();
            for (var i = 1; i < ordenadas.Count; i++)
                if (ordenadas[i].Desde < ordenadas[i - 1].Hasta)
                    throw new ValidacionException("Hay franjas horarias que se superponen en el mismo día.");
        }

        var config = await agenda.ObtenerConfiguracionAsync(usuarioId, ct) ?? ConfiguracionAgenda.Crear(usuarioId);
        ReglasDominio.Ejecutar(() =>
            config.Actualizar(pedido.DescansoEntreSesionesMinutos, pedido.AnticipacionMinimaHoras));

        await agenda.GuardarAgendaAsync(usuarioId, franjas, config, ct);
        return ADto(franjas, config);
    }

    // ---------- Ausencias ----------

    public async Task<IReadOnlyList<AusenciaDto>> ListarAusenciasAsync(Guid usuarioId, CancellationToken ct = default)
    {
        await ExigirProfesionalAsync(usuarioId, ct);
        var lista = await agenda.ListarAusenciasAsync(usuarioId, ct);
        return lista.Select(ADto).ToList();
    }

    public async Task<AusenciaDto> CrearAusenciaAsync(
        Guid usuarioId, CrearAusenciaRequest pedido, CancellationToken ct = default)
    {
        await ExigirProfesionalAsync(usuarioId, ct);

        var desde = LeerFecha(pedido.Desde);
        var hasta = LeerFecha(pedido.Hasta);
        var ausencia = ReglasDominio.Ejecutar(() =>
            Ausencia.Crear(usuarioId, desde, hasta, pedido.Motivo, reloj.GetUtcNow().UtcDateTime));

        await agenda.AgregarAusenciaAsync(ausencia, ct);
        return ADto(ausencia);
    }

    public async Task EliminarAusenciaAsync(Guid usuarioId, Guid ausenciaId, CancellationToken ct = default)
    {
        await ExigirProfesionalAsync(usuarioId, ct);
        if (!await agenda.EliminarAusenciaAsync(ausenciaId, usuarioId, ct))
            throw new NoEncontradoException("La ausencia no existe.");
    }

    // ---------- Horarios que se ofrecen ----------

    /// <summary>Horarios libres de un profesional publicado para una fecha (público).</summary>
    public async Task<HorariosDisponiblesDto> ObtenerHorariosDisponiblesAsync(
        Guid profesionalId, string? fecha, Guid? prestacionId, CancellationToken ct = default)
    {
        var dia = LeerFecha(fecha);
        var disponibilidad = await CalcularDisponibilidadAsync(profesionalId, dia, prestacionId, ct);

        return new HorariosDisponiblesDto(
            dia.ToString(FormatoFecha, CultureInfo.InvariantCulture),
            disponibilidad.DuracionMinutos,
            disponibilidad.Libres.Select(h => h.ToString(FormatoHora, CultureInfo.InvariantCulture)).ToList());
    }

    /// <summary>
    /// Calcula qué se puede ofrecer ese día. Falla con "no encontrado" si el profesional no existe,
    /// no tiene el perfil publicado o la prestación no es suya.
    /// </summary>
    public async Task<DisponibilidadDia> CalcularDisponibilidadAsync(
        Guid profesionalId, DateOnly fecha, Guid? prestacionId, CancellationToken ct = default)
    {
        var profesional = await usuarios.ObtenerPorIdAsync(profesionalId, ct);
        var perfil = profesional is { Rol: Rol.Profesional }
            ? await perfiles.ObtenerPorUsuarioAsync(profesionalId, ct)
            : null;

        if (perfil is not { Publicado: true })
            throw new NoEncontradoException("El profesional no existe o no tiene el perfil publicado.");

        // Criterio 3: la duración del turno se ajusta a la prestación elegida.
        var duracion = perfil.DuracionSesionMinutos;
        if (prestacionId is { } id)
        {
            var prestacion = await prestaciones.ObtenerAsync(id, profesionalId, ct)
                             ?? throw new NoEncontradoException("La prestación no existe.");
            duracion = prestacion.DuracionMinutos;
        }

        var franjas = await agenda.ObtenerFranjasAsync(profesionalId, ct);
        var ausencias = await agenda.ListarAusenciasAsync(profesionalId, ct);
        var config = await agenda.ObtenerConfiguracionAsync(profesionalId, ct);
        var descanso = config?.DescansoEntreSesionesMinutos ?? 0;
        var anticipacion = config?.AnticipacionMinimaHoras ?? 0;

        var minimoInicio = HoraLocal.Ahora(reloj).AddHours(anticipacion);
        var ocupados = (await turnos.ListarActivosDelDiaAsync(profesionalId, fecha, ct))
            .Select(t => new Intervalo(t.Inicio, t.Fin))
            .ToList();

        var posibles = GeneradorHorarios.Generar(fecha, franjas, ausencias, duracion, descanso, minimoInicio, []);
        var libres = GeneradorHorarios.Generar(fecha, franjas, ausencias, duracion, descanso, minimoInicio, ocupados);
        return new DisponibilidadDia(duracion, posibles, libres);
    }

    // ---------- Utilidades ----------

    internal static TimeOnly LeerHora(string? texto)
    {
        if (TimeOnly.TryParseExact(texto?.Trim(), FormatoHora, CultureInfo.InvariantCulture,
                DateTimeStyles.None, out var hora))
            return hora;
        throw new ValidacionException("La hora debe tener el formato HH:mm, por ejemplo 08:30.");
    }

    internal static DateOnly LeerFecha(string? texto)
    {
        if (DateOnly.TryParseExact(texto?.Trim(), FormatoFecha, CultureInfo.InvariantCulture,
                DateTimeStyles.None, out var fecha))
            return fecha;
        throw new ValidacionException("La fecha debe tener el formato yyyy-MM-dd, por ejemplo 2026-11-20.");
    }

    private async Task ExigirProfesionalAsync(Guid usuarioId, CancellationToken ct)
    {
        var usuario = await usuarios.ObtenerPorIdAsync(usuarioId, ct)
                      ?? throw new CredencialesInvalidasException("La sesión no es válida.");

        if (usuario.Rol != Rol.Profesional)
            throw new ValidacionException("Solo los profesionales tienen una agenda.");
    }

    private static AgendaDto ADto(IEnumerable<FranjaHoraria> franjas, ConfiguracionAgenda? config) => new(
        franjas
            .OrderBy(f => f.DiaSemana).ThenBy(f => f.Desde)
            .Select(f => new FranjaDto(
                f.DiaSemana,
                f.Desde.ToString(FormatoHora, CultureInfo.InvariantCulture),
                f.Hasta.ToString(FormatoHora, CultureInfo.InvariantCulture)))
            .ToList(),
        config?.DescansoEntreSesionesMinutos ?? 0,
        config?.AnticipacionMinimaHoras ?? 0);

    private static AusenciaDto ADto(Ausencia a) => new(
        a.Id,
        a.Desde.ToString(FormatoFecha, CultureInfo.InvariantCulture),
        a.Hasta.ToString(FormatoFecha, CultureInfo.InvariantCulture),
        a.Motivo);
}
