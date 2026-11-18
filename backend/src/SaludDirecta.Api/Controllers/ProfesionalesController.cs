using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SaludDirecta.Application.Verificacion;

namespace SaludDirecta.Api.Controllers;

[ApiController]
[Route("api/profesionales")]
public class ProfesionalesController(VerificacionService verificacion) : ControllerBase
{
    /// <summary>Verifica la matrícula que el profesional declaró al registrarse.</summary>
    [HttpPost("me/verificacion")]
    [Authorize(Roles = "profesional")]
    [ProducesResponseType(typeof(VerificacionDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Verificar(CancellationToken ct)
    {
        if (!TryObtenerUsuarioId(out var id)) return Unauthorized();
        return Ok(await verificacion.VerificarAsync(id, ct));
    }

    /// <summary>Estado de la última verificación del profesional autenticado.</summary>
    [HttpGet("me/verificacion")]
    [Authorize(Roles = "profesional")]
    [ProducesResponseType(typeof(VerificacionDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Estado(CancellationToken ct)
    {
        if (!TryObtenerUsuarioId(out var id)) return Unauthorized();
        return Ok(await verificacion.ObtenerEstadoAsync(id, ct));
    }

    /// <summary>Dato público: indica si el profesional tiene el distintivo de verificado.</summary>
    [HttpGet("{id:guid}/distintivo")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(DistintivoDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Distintivo(Guid id, CancellationToken ct) =>
        Ok(await verificacion.ObtenerDistintivoAsync(id, ct));

    private bool TryObtenerUsuarioId(out Guid id) =>
        Guid.TryParse(User.FindFirst("sub")?.Value, out id);
}
