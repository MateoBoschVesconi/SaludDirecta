using SaludDirecta.Application.Abstractions;
using SaludDirecta.Application.Common;
using SaludDirecta.Domain.Entities;

namespace SaludDirecta.Tests;

internal sealed class RepositorioEnMemoria : IUsuarioRepository
{
    public List<Usuario> Guardados { get; } = [];

    public Task<Usuario?> ObtenerPorIdAsync(Guid id, CancellationToken ct) =>
        Task.FromResult(Guardados.FirstOrDefault(u => u.Id == id));

    public Task<Usuario?> ObtenerPorEmailAsync(string emailNormalizado, CancellationToken ct) =>
        Task.FromResult(Guardados.FirstOrDefault(u => u.Email == emailNormalizado));

    public Task<bool> ExisteEmailAsync(string emailNormalizado, CancellationToken ct) =>
        Task.FromResult(Guardados.Any(u => u.Email == emailNormalizado));

    public Task AgregarAsync(Usuario usuario, CancellationToken ct)
    {
        if (Guardados.Any(u => u.Email == usuario.Email)) throw new EmailDuplicadoException();
        Guardados.Add(usuario);
        return Task.CompletedTask;
    }
}

internal sealed class HasherFalso : IPasswordHasher
{
    public string Hash(string password) => "hash:" + password;
    public bool Verificar(string password, string hash) => hash == "hash:" + password;
}

internal sealed class TokenFalso : ITokenService
{
    public TokenEmitido Emitir(Usuario usuario) =>
        new("token-de-" + usuario.Id, DateTime.UtcNow.AddHours(1));
}

/// <summary>Registro oficial falso: devuelve lo que el test le indique, o lanza una excepción.</summary>
internal sealed class RegistroFalso(RespuestaRegistro? respuesta = null, Exception? falla = null)
    : IRegistroProfesionales
{
    public int Consultas { get; private set; }

    public Task<RespuestaRegistro> ConsultarAsync(string matricula, string jurisdiccion, CancellationToken ct)
    {
        Consultas++;
        if (falla is not null) throw falla;
        return Task.FromResult(respuesta ?? new RespuestaRegistro(ResultadoConsulta.NoEncontrada));
    }
}

internal sealed class VerificacionRepositorioEnMemoria : IVerificacionRepository
{
    public List<VerificacionMatricula> Verificaciones { get; } = [];
    public List<EventoAuditoria> Auditoria { get; } = [];

    public Task RegistrarAsync(VerificacionMatricula verificacion, EventoAuditoria evento, CancellationToken ct)
    {
        Verificaciones.Add(verificacion);
        Auditoria.Add(evento);
        return Task.CompletedTask;
    }

    public Task<VerificacionMatricula?> ObtenerUltimaAsync(Guid usuarioId, CancellationToken ct) =>
        Task.FromResult(Verificaciones
            .Where(v => v.UsuarioId == usuarioId)
            .OrderByDescending(v => v.VerificadaEn)
            .FirstOrDefault());
}

internal sealed class PerfilRepositorioEnMemoria : IPerfilRepository
{
    public List<PerfilProfesional> Perfiles { get; } = [];
    public List<HistorialHonorario> Historial { get; } = [];
    public List<EventoAuditoria> Auditoria { get; } = [];
    public int Guardados { get; private set; }

    public Task<PerfilProfesional?> ObtenerPorUsuarioAsync(Guid usuarioId, CancellationToken ct) =>
        Task.FromResult(Perfiles.FirstOrDefault(p => p.UsuarioId == usuarioId));

    public Task GuardarAsync(
        PerfilProfesional perfil, HistorialHonorario? historial, EventoAuditoria? evento, CancellationToken ct)
    {
        Guardados++;
        if (!Perfiles.Contains(perfil)) Perfiles.Add(perfil);
        if (historial is not null) Historial.Add(historial);
        if (evento is not null) Auditoria.Add(evento);
        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<HistorialHonorario>> ObtenerHistorialAsync(Guid usuarioId, CancellationToken ct) =>
        Task.FromResult<IReadOnlyList<HistorialHonorario>>(Historial
            .Where(h => h.UsuarioId == usuarioId)
            .OrderByDescending(h => h.CambiadoEn)
            .ToList());
}

internal sealed class PrestacionRepositorioEnMemoria : IPrestacionRepository
{
    public List<Prestacion> Todas { get; } = [];

    public Task<IReadOnlyList<Prestacion>> ListarActivasAsync(Guid usuarioId, CancellationToken ct) =>
        Task.FromResult<IReadOnlyList<Prestacion>>(Todas
            .Where(p => p.UsuarioId == usuarioId && p.Activa)
            .OrderBy(p => p.Nombre)
            .ToList());

    public Task<Prestacion?> ObtenerAsync(Guid id, Guid usuarioId, CancellationToken ct) =>
        Task.FromResult(Todas.FirstOrDefault(p => p.Id == id && p.UsuarioId == usuarioId && p.Activa));

    public Task AgregarAsync(Prestacion prestacion, CancellationToken ct)
    {
        Todas.Add(prestacion);
        return Task.CompletedTask;
    }

    public Task GuardarCambiosAsync(CancellationToken ct) => Task.CompletedTask;
}

/// <summary>Reloj con una hora fija, para que los tests de turnos no dependan de cuándo se corren.</summary>
internal sealed class RelojFijo(DateTimeOffset ahora) : TimeProvider
{
    public override DateTimeOffset GetUtcNow() => ahora;
}

internal sealed class AgendaRepositorioEnMemoria : IAgendaRepository
{
    public List<FranjaHoraria> Franjas { get; } = [];
    public List<ConfiguracionAgenda> Configuraciones { get; } = [];
    public List<Ausencia> Ausencias { get; } = [];

    public Task<IReadOnlyList<FranjaHoraria>> ObtenerFranjasAsync(Guid usuarioId, CancellationToken ct) =>
        Task.FromResult<IReadOnlyList<FranjaHoraria>>(Franjas.Where(f => f.UsuarioId == usuarioId).ToList());

    public Task<ConfiguracionAgenda?> ObtenerConfiguracionAsync(Guid usuarioId, CancellationToken ct) =>
        Task.FromResult(Configuraciones.FirstOrDefault(c => c.UsuarioId == usuarioId));

    public Task GuardarAgendaAsync(
        Guid usuarioId, IReadOnlyList<FranjaHoraria> franjas, ConfiguracionAgenda configuracion, CancellationToken ct)
    {
        Franjas.RemoveAll(f => f.UsuarioId == usuarioId);
        Franjas.AddRange(franjas);
        if (!Configuraciones.Contains(configuracion)) Configuraciones.Add(configuracion);
        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<Ausencia>> ListarAusenciasAsync(Guid usuarioId, CancellationToken ct) =>
        Task.FromResult<IReadOnlyList<Ausencia>>(Ausencias
            .Where(a => a.UsuarioId == usuarioId).OrderBy(a => a.Desde).ToList());

    public Task AgregarAusenciaAsync(Ausencia ausencia, CancellationToken ct)
    {
        Ausencias.Add(ausencia);
        return Task.CompletedTask;
    }

    public Task<bool> EliminarAusenciaAsync(Guid id, Guid usuarioId, CancellationToken ct) =>
        Task.FromResult(Ausencias.RemoveAll(a => a.Id == id && a.UsuarioId == usuarioId) > 0);
}

/// <summary>
/// Turnos en memoria. Imita lo que garantiza la base de datos: al guardar, rechaza un turno activo
/// que se superponga con otro del mismo profesional, y lo hace de forma atómica (con un candado).
/// </summary>
internal sealed class TurnoRepositorioEnMemoria : ITurnoRepository
{
    private readonly object _candado = new();
    private readonly List<Turno> _turnos = [];

    public IReadOnlyList<Turno> Todos
    {
        get { lock (_candado) return _turnos.ToList(); }
    }

    public Task<IReadOnlyList<Turno>> ListarActivosDelDiaAsync(Guid profesionalId, DateOnly fecha, CancellationToken ct)
    {
        lock (_candado)
        {
            var inicio = fecha.ToDateTime(TimeOnly.MinValue);
            return Task.FromResult<IReadOnlyList<Turno>>(_turnos
                .Where(t => t.ProfesionalId == profesionalId && t.OcupaHorario
                            && t.Inicio >= inicio && t.Inicio < inicio.AddDays(1))
                .ToList());
        }
    }

    public Task AgregarAsync(Turno turno, CancellationToken ct)
    {
        lock (_candado)
        {
            if (_turnos.Any(t => t.ProfesionalId == turno.ProfesionalId && t.OcupaHorario
                                 && t.Solapa(turno.Inicio, turno.Fin)))
                throw new TurnoOcupadoException("El horario elegido ya fue reservado por otro paciente.");

            _turnos.Add(turno);
        }
        return Task.CompletedTask;
    }

    public Task<Turno?> ObtenerAsync(Guid id, CancellationToken ct)
    {
        lock (_candado) return Task.FromResult(_turnos.FirstOrDefault(t => t.Id == id));
    }

    public Task GuardarCambiosAsync(CancellationToken ct) => Task.CompletedTask;

    public Task<IReadOnlyList<Turno>> ListarDePacienteAsync(Guid pacienteId, CancellationToken ct)
    {
        lock (_candado)
            return Task.FromResult<IReadOnlyList<Turno>>(_turnos.Where(t => t.PacienteId == pacienteId).ToList());
    }

    public Task<IReadOnlyList<Turno>> ListarDeProfesionalAsync(Guid profesionalId, CancellationToken ct)
    {
        lock (_candado)
            return Task.FromResult<IReadOnlyList<Turno>>(_turnos.Where(t => t.ProfesionalId == profesionalId).ToList());
    }
}
