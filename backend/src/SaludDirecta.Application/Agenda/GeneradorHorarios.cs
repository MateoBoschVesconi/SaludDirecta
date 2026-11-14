using SaludDirecta.Domain.Entities;

namespace SaludDirecta.Application.Agenda;

public sealed record Intervalo(DateTime Inicio, DateTime Fin);

/// <summary>
/// Calcula los horarios de inicio posibles para un día. Es la única regla que decide qué se ofrece (HU8):
/// solo dentro de las franjas, fuera de las ausencias, con la duración de la prestación y sin superponerse.
/// </summary>
public static class GeneradorHorarios
{
    /// <param name="fecha">Día consultado.</param>
    /// <param name="franjas">Franjas del profesional (de cualquier día; se filtran acá).</param>
    /// <param name="ausencias">Ausencias del profesional.</param>
    /// <param name="duracionMinutos">Duración del turno, según la prestación elegida.</param>
    /// <param name="descansoMinutos">Pausa entre un turno y el siguiente.</param>
    /// <param name="minimoInicio">No se ofrece nada que empiece antes (ahora + anticipación mínima).</param>
    /// <param name="ocupados">Intervalos ya tomados por otros turnos.</param>
    public static IReadOnlyList<TimeOnly> Generar(
        DateOnly fecha,
        IEnumerable<FranjaHoraria> franjas,
        IEnumerable<Ausencia> ausencias,
        int duracionMinutos,
        int descansoMinutos,
        DateTime minimoInicio,
        IEnumerable<Intervalo> ocupados)
    {
        var resultado = new List<TimeOnly>();
        if (duracionMinutos <= 0) return resultado;
        if (ausencias.Any(a => a.Cubre(fecha))) return resultado;

        var ocupadosLista = ocupados.ToList();
        var paso = duracionMinutos + Math.Max(0, descansoMinutos);
        var dia = (int)fecha.DayOfWeek;

        foreach (var franja in franjas.Where(f => f.DiaSemana == dia).OrderBy(f => f.Desde))
        {
            var desde = franja.Desde.Hour * 60 + franja.Desde.Minute;
            var hasta = franja.Hasta.Hour * 60 + franja.Hasta.Minute;

            for (var minuto = desde; minuto + duracionMinutos <= hasta; minuto += paso)
            {
                var hora = new TimeOnly(minuto / 60, minuto % 60);
                var inicio = fecha.ToDateTime(hora);
                var fin = inicio.AddMinutes(duracionMinutos);

                if (inicio < minimoInicio) continue;
                if (ocupadosLista.Any(o => o.Inicio < fin && inicio < o.Fin)) continue;

                resultado.Add(hora);
            }
        }

        return resultado.Distinct().OrderBy(h => h).ToList();
    }
}
