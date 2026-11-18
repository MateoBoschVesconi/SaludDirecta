using SaludDirecta.Application.Verificacion;

namespace SaludDirecta.Application.Perfil;

public sealed record GuardarPerfilRequest(
    string? Especialidad,
    string? Descripcion,
    string? Direccion,
    string? Ciudad,
    string? Telefono,
    int DuracionSesionMinutos,
    bool TieneRampa,
    bool TieneAscensor,
    bool TieneBanoAdaptado);

public sealed record CambiarHonorarioRequest(decimal Honorario);

/// <summary>Perfil completo, tal como lo ve el propio profesional en su panel.</summary>
public sealed record PerfilDto(
    Guid UsuarioId,
    string Nombre,
    string? Profesion,
    string? Matricula,
    string? Jurisdiccion,
    string? Especialidad,
    string? Descripcion,
    string? Direccion,
    string? Ciudad,
    string? Telefono,
    decimal? HonorarioConsulta,
    int DuracionSesionMinutos,
    bool TieneRampa,
    bool TieneAscensor,
    bool TieneBanoAdaptado,
    bool Publicado,
    VerificacionDto Verificacion,
    DateTime? ActualizadoEn);

public sealed record HonorarioHistorialDto(decimal? ValorAnterior, decimal ValorNuevo, DateTime CambiadoEn);

/// <summary>Perfil que ven los pacientes. Incluye el honorario y el estado de verificación (criterio 3 de la HU4).</summary>
public sealed record PerfilPublicoDto(
    Guid Id,
    string Nombre,
    string? Profesion,
    string? Especialidad,
    string? Matricula,
    string? Jurisdiccion,
    string? Descripcion,
    string? Direccion,
    string? Ciudad,
    string? Telefono,
    decimal HonorarioConsulta,
    int DuracionSesionMinutos,
    bool TieneRampa,
    bool TieneAscensor,
    bool TieneBanoAdaptado,
    bool Verificado,
    DateTime? VerificadaEn,
    IReadOnlyList<PrestacionDto> Prestaciones);

public sealed record GuardarPrestacionRequest(string? Nombre, int DuracionMinutos);

public sealed record PrestacionDto(Guid Id, string Nombre, int DuracionMinutos);
