using SaludDirecta.Application.Abstractions;
using SaludDirecta.Application.Common;
using SaludDirecta.Domain.Entities;

namespace SaludDirecta.Application.Perfil;

/// <summary>ABM de las prestaciones de un profesional (HU4). Cada profesional solo toca las suyas.</summary>
public sealed class PrestacionService(IPrestacionRepository prestaciones, TimeProvider reloj)
{
    private const string NoExiste = "La prestación no existe.";

    public async Task<IReadOnlyList<PrestacionDto>> ListarAsync(Guid usuarioId, CancellationToken ct = default)
    {
        var activas = await prestaciones.ListarActivasAsync(usuarioId, ct);
        return activas.Select(ADto).ToList();
    }

    public async Task<PrestacionDto> CrearAsync(
        Guid usuarioId, GuardarPrestacionRequest pedido, CancellationToken ct = default)
    {
        var prestacion = ReglasDominio.Ejecutar(() => Prestacion.Crear(
            usuarioId, pedido.Nombre, pedido.DuracionMinutos, reloj.GetUtcNow().UtcDateTime));

        await prestaciones.AgregarAsync(prestacion, ct);
        return ADto(prestacion);
    }

    public async Task<PrestacionDto> ActualizarAsync(
        Guid usuarioId, Guid id, GuardarPrestacionRequest pedido, CancellationToken ct = default)
    {
        // Si la prestación es de otro profesional, se responde "no existe" para no revelar que existe.
        var prestacion = await prestaciones.ObtenerAsync(id, usuarioId, ct)
                         ?? throw new NoEncontradoException(NoExiste);

        ReglasDominio.Ejecutar(() => prestacion.Modificar(pedido.Nombre, pedido.DuracionMinutos));

        await prestaciones.GuardarCambiosAsync(ct);
        return ADto(prestacion);
    }

    /// <summary>Baja lógica: deja de verse y de ofrecerse, pero el registro se conserva.</summary>
    public async Task EliminarAsync(Guid usuarioId, Guid id, CancellationToken ct = default)
    {
        var prestacion = await prestaciones.ObtenerAsync(id, usuarioId, ct)
                         ?? throw new NoEncontradoException(NoExiste);

        prestacion.DarDeBaja();
        await prestaciones.GuardarCambiosAsync(ct);
    }

    internal static PrestacionDto ADto(Prestacion p) => new(p.Id, p.Nombre, p.DuracionMinutos);
}
