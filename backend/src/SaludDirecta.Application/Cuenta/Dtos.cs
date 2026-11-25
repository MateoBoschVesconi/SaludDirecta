namespace SaludDirecta.Application.Cuenta;

/// <summary>La contraseña confirma que quien pide el borrado es el titular de la cuenta.</summary>
public sealed record EliminarCuentaRequest(string? Password);

public sealed record CuentaEliminadaDto(int TurnosCancelados);

/// <summary>Todo lo que el sistema guarda sobre una persona (derecho de acceso, Ley 25.326).</summary>
public sealed record DatosPersonalesDto(
    DateTime GeneradoEn,
    CuentaExportada Cuenta,
    PerfilExportado? Perfil,
    IReadOnlyList<TurnoExportado> Turnos,
    IReadOnlyList<NotificacionExportada> Notificaciones);

public sealed record CuentaExportada(
    Guid Id,
    string Nombre,
    string Email,
    string Telefono,
    string Rol,
    string? Profesion,
    string? Matricula,
    string? Jurisdiccion,
    DateTime ConsentimientoAceptadoEn,
    DateTime CreadoEn);

public sealed record PerfilExportado(
    string? Especialidad,
    string? Descripcion,
    string? Direccion,
    string? Ciudad,
    string? Telefono,
    decimal? HonorarioConsulta,
    int DuracionSesionMinutos,
    bool Publicado);

public sealed record TurnoExportado(Guid Id, string Fecha, string Hora, string Estado, string Contraparte);

public sealed record NotificacionExportada(string Tipo, string Asunto, string Mensaje, DateTime CreadoEn);
