using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SaludDirecta.Application.Cuenta;

namespace SaludDirecta.Api.Controllers;

/// <summary>HU14: derechos de acceso y supresión sobre los datos personales (Ley 25.326).</summary>
[ApiController]
[Route("api/cuenta")]
[Authorize]
public class CuentaController(CuentaService cuenta) : ControllerBase
{
    /// <summary>Descarga todo lo que el sistema guarda sobre mí (cuenta, perfil, turnos y avisos).</summary>
    [HttpGet("me/datos")]
    [ProducesResponseType(typeof(DatosPersonalesDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> MisDatos(CancellationToken ct)
    {
        if (!TryObtenerUsuarioId(out var id)) return Unauthorized();
        return Ok(await cuenta.ExportarMisDatosAsync(id, ct));
    }

    /// <summary>
    /// Elimina mi cuenta: cancela mis turnos activos, borra mis datos personales y cierra el acceso.
    /// Exige la contraseña en el cuerpo. No se puede deshacer.
    /// </summary>
    [HttpDelete("me")]
    [ProducesResponseType(typeof(CuentaEliminadaDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> EliminarMiCuenta([FromBody] EliminarCuentaRequest request, CancellationToken ct)
    {
        if (!TryObtenerUsuarioId(out var id)) return Unauthorized();
        return Ok(await cuenta.EliminarCuentaAsync(id, request, ct));
    }

    private bool TryObtenerUsuarioId(out Guid id) =>
        Guid.TryParse(User.FindFirst("sub")?.Value, out id);
}
