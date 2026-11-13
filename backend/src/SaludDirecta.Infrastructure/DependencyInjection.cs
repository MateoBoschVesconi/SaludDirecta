using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SaludDirecta.Application.Abstractions;
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
        services.AddDbContext<AppDbContext>(o => o.UseNpgsql(conexion));

        services.AddScoped<IUsuarioRepository, UsuarioRepository>();
        services.AddScoped<IVerificacionRepository, VerificacionRepository>();
        services.AddSingleton<IPasswordHasher, Pbkdf2PasswordHasher>();
        services.AddSingleton<ITokenService, JwtTokenService>();
        services.AddSingleton(TimeProvider.System);

        // Adapter del registro oficial: hoy es el simulado. Para usar REFEPS/SISA real,
        // se reemplaza esta línea por la clase que implemente IRegistroProfesionales.
        services.AddSingleton<IRegistroProfesionales, RegistroProfesionalesSimulado>();

        return services;
    }
}
