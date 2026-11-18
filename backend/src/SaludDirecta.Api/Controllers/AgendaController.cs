using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SaludDirecta.Application.Agenda;

namespace SaludDirecta.Api.Controllers;

/// <summary>HU8: disponibilidad horaria, ausencias y horarios disponibles del profesional.</summary>
[ApiController]
[Route("api/profesionales")]
public class AgendaController(AgendaService agenda) : ControllerBase
{
    /// <summary>Disponibilidad semanal y ajustes de la agenda del profesional autenticado.</summary>
    [HttpGet("me/agenda")]
    [Authorize(Roles = "profesional")]
    [ProducesResponseType(typeof(AgendaDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> MiAgenda(CancellationToken ct)
    {
        if (!TryObtenerUsuarioId(out var id)) return Unauthorized();
        return Ok(await agenda.ObtenerAgendaAsync(id, ct));
    }

    /// <summary>Reemplaza toda la disponibilidad semanal (franjas) y los ajustes de la agenda.</summary>
    [HttpPut("me/agenda")]
    [Authorize(Roles = "profesional")]
    [ProducesResponseType(typeof(AgendaDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GuardarAgenda([FromBody] GuardarAgendaRequest pedido, CancellationToken ct)
    {
        if (!TryObtenerUsuarioId(out var id)) return Unauthorized();
        return Ok(await agenda.GuardarAgendaAsync(id, pedido, ct));
    }

    [HttpGet("me/ausencias")]
    [Authorize(Roles = "profesional")]
    [ProducesResponseType(typeof(IReadOnlyList<AusenciaDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ListarAusencias(CancellationToken ct)
    {
        if (!TryObtenerUsuarioId(out var id)) return Unauthorized();
        return Ok(await agenda.ListarAusenciasAsync(id, ct));
    }

    /// <summary>Registra un período de ausencia. Mientras dure, no se ofrecen horarios para reservar.</summary>
    [HttpPost("me/ausencias")]
    [Authorize(Roles = "profesional")]
    [ProducesResponseType(typeof(AusenciaDto), StatusCodes.Status201Created)]
    public async Task<IActionResult> CrearAusencia([FromBody] CrearAusenciaRequest pedido, CancellationToken ct)
    {
        if (!TryObtenerUsuarioId(out var id)) return Unauthorized();
        var creada = await agenda.CrearAusenciaAsync(id, pedido, ct);
        return Created($"/api/profesionales/me/ausencias/{creada.Id}", creada);
    }

    [HttpDelete("me/ausencias/{ausenciaId:guid}")]
    [Authorize(Roles = "profesional")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> EliminarAusencia(Guid ausenciaId, CancellationToken ct)
    {
        if (!TryObtenerUsuarioId(out var id)) return Unauthorized();
        await agenda.EliminarAusenciaAsync(id, ausenciaId, ct);
        return NoContent();
    }

    /// <summary>
    /// Horarios libres de un profesional para una fecha (público). <c>fecha</c> con formato yyyy-MM-dd;
    /// <c>prestacionId</c> es opcional y ajusta la duración del turno.
    /// </summary>
    [HttpGet("{id:guid}/horarios-disponibles")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(HorariosDisponiblesDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> HorariosDisponibles(
        Guid id, [FromQuery] string? fecha, [FromQuery] Guid? prestacionId, CancellationToken ct) =>
        Ok(await agenda.ObtenerHorariosDisponiblesAsync(id, fecha, prestacionId, ct));

    private bool TryObtenerUsuarioId(out Guid id) =>
        Guid.TryParse(User.FindFirst("sub")?.Value, out id);
}
