using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SaludDirecta.Application.Turnos;

namespace SaludDirecta.Api.Controllers;

/// <summary>HU9: reserva de turnos con control de concurrencia, estados y consulta.</summary>
[ApiController]
[Route("api/turnos")]
[Authorize]
public class TurnosController(TurnoService turnos) : ControllerBase
{
    /// <summary>
    /// Reserva un turno (solo pacientes). Responde 409 si el horario ya fue tomado, aun cuando dos
    /// solicitudes lleguen al mismo tiempo.
    /// </summary>
    [HttpPost]
    [Authorize(Roles = "paciente")]
    [ProducesResponseType(typeof(TurnoDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Reservar([FromBody] ReservarTurnoRequest pedido, CancellationToken ct)
    {
        if (!TryObtenerUsuarioId(out var id)) return Unauthorized();
        var turno = await turnos.ReservarAsync(id, pedido, ct);
        return Created($"/api/turnos/{turno.Id}", turno);
    }

    /// <summary>Mis turnos: los que pedí (paciente) o los que me pidieron (profesional).</summary>
    [HttpGet("me")]
    [ProducesResponseType(typeof(IReadOnlyList<TurnoDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> MisTurnos(CancellationToken ct)
    {
        if (!TryObtenerUsuarioId(out var id)) return Unauthorized();
        return Ok(await turnos.ListarMisTurnosAsync(id, ct));
    }

    /// <summary>Estado y datos de un turno. Solo lo ven su paciente y su profesional.</summary>
    [HttpGet("{turnoId:guid}")]
    [ProducesResponseType(typeof(TurnoDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Obtener(Guid turnoId, CancellationToken ct)
    {
        if (!TryObtenerUsuarioId(out var id)) return Unauthorized();
        return Ok(await turnos.ObtenerAsync(id, turnoId, ct));
    }

    /// <summary>
    /// Cambia el estado del turno (confirmado, cumplido, cancelado o ausente) siguiendo las transiciones válidas.
    /// El paciente solo puede cancelar.
    /// </summary>
    [HttpPost("{turnoId:guid}/estado")]
    [ProducesResponseType(typeof(TurnoDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CambiarEstado(
        Guid turnoId, [FromBody] CambiarEstadoTurnoRequest pedido, CancellationToken ct)
    {
        if (!TryObtenerUsuarioId(out var id)) return Unauthorized();
        return Ok(await turnos.CambiarEstadoAsync(id, turnoId, pedido, ct));
    }

    private bool TryObtenerUsuarioId(out Guid id) =>
        Guid.TryParse(User.FindFirst("sub")?.Value, out id);
}
