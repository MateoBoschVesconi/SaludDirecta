using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using SaludDirecta.Application.Abstractions;
using SaludDirecta.Infrastructure.Notificaciones;
using SaludDirecta.Infrastructure.Persistence;
using SaludDirecta.Infrastructure.Refeps;
using SaludDirecta.Infrastructure.Security;

namespace SaludDirecta.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration config)
    {
        var conexion = config.GetConnectionString("Default");
        if (string.IsNullOrWhiteSpace(conexion))
            throw new InvalidOperationException(
                "Falta ConnectionStrings:Default. Configurala con user-secrets o la variable " +
                "de entorno ConnectionStrings__Default (ver backend/README.md).");

        services.Configure<JwtOptions>(config.GetSection(JwtOptions.Seccion));
        services.Configure<RefepsOptions>(config.GetSection(RefepsOptions.Seccion));
        services.AddDbContext<AppDbContext>(o => o.UseNpgsql(LimitarConexiones(conexion)));

        services.AddScoped<IUsuarioRepository, UsuarioRepository>();
        services.AddScoped<IVerificacionRepository, VerificacionRepository>();
        services.AddScoped<IPerfilRepository, PerfilRepository>();
        services.AddScoped<IPrestacionRepository, PrestacionRepository>();
        services.AddScoped<IAgendaRepository, AgendaRepository>();
        services.AddScoped<ITurnoRepository, TurnoRepository>();
        services.AddScoped<INotificacionRepository, NotificacionRepository>();
        services.AddScoped<ICuentaRepository, CuentaRepository>();
        services.AddSingleton<IPasswordHasher, Pbkdf2PasswordHasher>();
        services.AddSingleton<ITokenService, JwtTokenService>();
        services.AddSingleton(TimeProvider.System);

        // Adapter del registro oficial: hoy es el simulado. Para usar REFEPS/SISA real,
        // se reemplaza esta línea por la clase que implemente IRegistroProfesionales.
        services.AddSingleton<IRegistroProfesionales, RegistroProfesionalesSimulado>();

        // Canal de envío de notificaciones (HU10): hoy es el simulado, que deja el aviso en el registro del
        // sistema. Para mandar mails reales se escribe otra clase que implemente IEnviadorNotificaciones
        // y se reemplaza esta línea.
        services.AddScoped<IEnviadorNotificaciones, EnviadorEnRegistro>();

        return services;
    }

    /// <summary>
    /// Npgsql abre hasta 100 conexiones por defecto y PostgreSQL acepta unas 100 en total, así que una
    /// ráfaga de solicitudes simultáneas se quedaba sin conexiones ("53300: demasiados clientes").
    /// Con un tope más bajo, las solicitudes sobrantes esperan su turno en lugar de fallar.
    /// Si la cadena de conexión ya define "Maximum Pool Size", se respeta.
    /// </summary>
    private static string LimitarConexiones(string conexion)
    {
        const int TopeDelPool = 20;
        var cadena = new NpgsqlConnectionStringBuilder(conexion);
        var definidoPorElUsuario = conexion.Contains("Maximum Pool Size", StringComparison.OrdinalIgnoreCase)
                                   || conexion.Contains("MaxPoolSize", StringComparison.OrdinalIgnoreCase);
        if (!definidoPorElUsuario) cadena.MaxPoolSize = TopeDelPool;
        return cadena.ConnectionString;
    }
}
