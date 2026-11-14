using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SaludDirecta.Application.Notificaciones;

namespace SaludDirecta.Api.Controllers;

/// <summary>HU10: bandeja de notificaciones del usuario (pacientes y profesionales).</summary>
[ApiController]
[Route("api/notificaciones")]
[Authorize]
public class NotificacionesController(NotificacionService notificaciones) : ControllerBase
{
    /// <summary>Mis notificaciones, de la más nueva a la más vieja.</summary>
    [HttpGet("me")]
    [ProducesResponseType(typeof(IReadOnlyList<NotificacionDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> MisNotificaciones(CancellationToken ct)
    {
        if (!TryObtenerUsuarioId(out var id)) return Unauthorized();
        return Ok(await notificaciones.ListarMisNotificacionesAsync(id, ct));
    }

    /// <summary>Marca una notificación propia como leída.</summary>
    [HttpPost("{notificacionId:guid}/leida")]
    [ProducesResponseType(typeof(NotificacionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> MarcarLeida(Guid notificacionId, CancellationToken ct)
    {
        if (!TryObtenerUsuarioId(out var id)) return Unauthorized();
        return Ok(await notificaciones.MarcarLeidaAsync(id, notificacionId, ct));
    }

    private bool TryObtenerUsuarioId(out Guid id) =>
        Guid.TryParse(User.FindFirst("sub")?.Value, out id);
}
