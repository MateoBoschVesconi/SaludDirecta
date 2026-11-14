using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SaludDirecta.Application.Perfil;

namespace SaludDirecta.Api.Controllers;

/// <summary>HU4: perfil público, honorarios con historial y prestaciones del profesional.</summary>
[ApiController]
[Route("api/profesionales")]
public class PerfilProfesionalController(PerfilService perfil, PrestacionService prestaciones) : ControllerBase
{
    // ---------- Perfil del profesional autenticado ----------

    /// <summary>Perfil del profesional autenticado (vacío si todavía no lo completó).</summary>
    [HttpGet("me/perfil")]
    [Authorize(Roles = "profesional")]
    [ProducesResponseType(typeof(PerfilDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> MiPerfil(CancellationToken ct)
    {
        if (!TryObtenerUsuarioId(out var id)) return Unauthorized();
        return Ok(await perfil.ObtenerMiPerfilAsync(id, ct));
    }

    /// <summary>Crea o actualiza los datos descriptivos y del consultorio.</summary>
    [HttpPut("me/perfil")]
    [Authorize(Roles = "profesional")]
    [ProducesResponseType(typeof(PerfilDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GuardarPerfil([FromBody] GuardarPerfilRequest pedido, CancellationToken ct)
    {
        if (!TryObtenerUsuarioId(out var id)) return Unauthorized();
        return Ok(await perfil.GuardarPerfilAsync(id, pedido, ct));
    }

    /// <summary>Fija o modifica el honorario de la consulta. Cada cambio queda en el historial.</summary>
    [HttpPut("me/perfil/honorario")]
    [Authorize(Roles = "profesional")]
    [ProducesResponseType(typeof(PerfilDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> CambiarHonorario([FromBody] CambiarHonorarioRequest pedido, CancellationToken ct)
    {
        if (!TryObtenerUsuarioId(out var id)) return Unauthorized();
        return Ok(await perfil.CambiarHonorarioAsync(id, pedido, ct));
    }

    /// <summary>Publica el perfil. Exige que el honorario de la consulta ya esté definido.</summary>
    [HttpPost("me/perfil/publicar")]
    [Authorize(Roles = "profesional")]
    [ProducesResponseType(typeof(PerfilDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Publicar(CancellationToken ct)
    {
        if (!TryObtenerUsuarioId(out var id)) return Unauthorized();
        return Ok(await perfil.PublicarAsync(id, ct));
    }

    /// <summary>Oculta el perfil del buscador y de la vista pública.</summary>
    [HttpPost("me/perfil/despublicar")]
    [Authorize(Roles = "profesional")]
    [ProducesResponseType(typeof(PerfilDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Despublicar(CancellationToken ct)
    {
        if (!TryObtenerUsuarioId(out var id)) return Unauthorized();
        return Ok(await perfil.DespublicarAsync(id, ct));
    }

    /// <summary>Historial de modificaciones del honorario, de la más reciente a la más antigua.</summary>
    [HttpGet("me/perfil/honorarios/historial")]
    [Authorize(Roles = "profesional")]
    [ProducesResponseType(typeof(IReadOnlyList<HonorarioHistorialDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Historial(CancellationToken ct)
    {
        if (!TryObtenerUsuarioId(out var id)) return Unauthorized();
        return Ok(await perfil.ObtenerHistorialHonorariosAsync(id, ct));
    }

    // ---------- Prestaciones ----------

    [HttpGet("me/prestaciones")]
    [Authorize(Roles = "profesional")]
    [ProducesResponseType(typeof(IReadOnlyList<PrestacionDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ListarPrestaciones(CancellationToken ct)
    {
        if (!TryObtenerUsuarioId(out var id)) return Unauthorized();
        return Ok(await prestaciones.ListarAsync(id, ct));
    }

    [HttpPost("me/prestaciones")]
    [Authorize(Roles = "profesional")]
    [ProducesResponseType(typeof(PrestacionDto), StatusCodes.Status201Created)]
    public async Task<IActionResult> CrearPrestacion([FromBody] GuardarPrestacionRequest pedido, CancellationToken ct)
    {
        if (!TryObtenerUsuarioId(out var id)) return Unauthorized();
        var creada = await prestaciones.CrearAsync(id, pedido, ct);
        return Created($"/api/profesionales/me/prestaciones/{creada.Id}", creada);
    }

    [HttpPut("me/prestaciones/{prestacionId:guid}")]
    [Authorize(Roles = "profesional")]
    [ProducesResponseType(typeof(PrestacionDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> ActualizarPrestacion(
        Guid prestacionId, [FromBody] GuardarPrestacionRequest pedido, CancellationToken ct)
    {
        if (!TryObtenerUsuarioId(out var id)) return Unauthorized();
        return Ok(await prestaciones.ActualizarAsync(id, prestacionId, pedido, ct));
    }

    [HttpDelete("me/prestaciones/{prestacionId:guid}")]
    [Authorize(Roles = "profesional")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> EliminarPrestacion(Guid prestacionId, CancellationToken ct)
    {
        if (!TryObtenerUsuarioId(out var id)) return Unauthorized();
        await prestaciones.EliminarAsync(id, prestacionId, ct);
        return NoContent();
    }

    // ---------- Vista pública ----------

    /// <summary>Perfil público del profesional. Responde 404 si no existe o no está publicado.</summary>
    [HttpGet("{id:guid}/perfil")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(PerfilPublicoDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> PerfilPublico(Guid id, CancellationToken ct) =>
        Ok(await perfil.ObtenerPerfilPublicoAsync(id, ct));

    private bool TryObtenerUsuarioId(out Guid id) =>
        Guid.TryParse(User.FindFirst("sub")?.Value, out id);
}
