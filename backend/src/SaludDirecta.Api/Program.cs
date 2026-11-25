using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using SaludDirecta.Api.Background;
using SaludDirecta.Api.Middleware;
using SaludDirecta.Application.Abstractions;
using SaludDirecta.Application.Auth;
using SaludDirecta.Application.Cuenta;
using SaludDirecta.Application.Agenda;
using SaludDirecta.Application.Notificaciones;
using SaludDirecta.Application.Perfil;
using SaludDirecta.Application.Turnos;
using SaludDirecta.Application.Verificacion;
using SaludDirecta.Infrastructure;
using SaludDirecta.Infrastructure.Security;

var builder = WebApplication.CreateBuilder(args);

// --- Servicios de la aplicación e infraestructura ---
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddScoped<AuthService>();

// HU2: verificación de matrícula (cadena de pasos sobre el Adapter del registro oficial)
builder.Services.AddScoped(sp => CadenaVerificacion.Estandar(sp.GetRequiredService<IRegistroProfesionales>()));
builder.Services.AddScoped<VerificacionService>();

// HU4: perfil público, honorarios con historial y prestaciones
builder.Services.AddScoped<PerfilService>();
builder.Services.AddScoped<PrestacionService>();

// HU8 y HU9: agenda del profesional, reserva de turnos con control de concurrencia
builder.Services.AddScoped<AgendaService>();
builder.Services.AddScoped<TurnoService>();

// HU10: notificaciones y recordatorios. El notificador es un observador de los turnos
// (el servicio de turnos le avisa lo que pasa) y el servicio de fondo envía las pendientes.
builder.Services.AddScoped<ITurnoObservador, NotificadorDeTurnos>();
builder.Services.AddScoped<NotificacionService>();

// HU14: acceso y supresión de datos personales
builder.Services.AddScoped<CuentaService>();
builder.Services.AddHostedService<ServicioDeRecordatorios>();

// --- Autenticación JWT (HU1) ---
var jwt = builder.Configuration.GetSection(JwtOptions.Seccion).Get<JwtOptions>() ?? new JwtOptions();
jwt.Validar();

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opciones =>
    {
        opciones.MapInboundClaims = false; // conserva "sub", "role", "name" tal cual
        opciones.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwt.Issuer,
            ValidateAudience = true,
            ValidAudience = jwt.Audience,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Key)),
            ClockSkew = TimeSpan.FromMinutes(1),
            NameClaimType = "name",
            RoleClaimType = "role"
        };
    });
builder.Services.AddAuthorization();

// --- CORS para el frontend (Vite corre en :5173) ---
var origenes = builder.Configuration.GetSection("Cors:Origins").Get<string[]>()
               ?? ["http://localhost:5173"];
builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
    p.WithOrigins(origenes).AllowAnyHeader().AllowAnyMethod()));

// --- Límite de intentos en registro e inicio de sesión (RNF-03, contra fuerza bruta) ---
var intentosPorMinuto = builder.Configuration.GetValue("Seguridad:IntentosPorMinuto", 10);
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    o.AddPolicy("auth", contexto => RateLimitPartition.GetFixedWindowLimiter(
        contexto.Connection.RemoteIpAddress?.ToString() ?? "desconocida",
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = intentosPorMinuto,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0
        }));
});

// --- API + Swagger ---
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Salud Directa API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Pegá el token JWT devuelto por /api/auth/login"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

app.UseMiddleware<CabecerasSeguridadMiddleware>();
app.UseMiddleware<ManejoExcepcionesMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// TLS (RNF-03): en producción se fuerza HTTPS; en desarrollo se usa http://localhost:5000.
if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
    app.UseHttpsRedirection();
}

app.UseCors();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();

public partial class Program; // permite pruebas de integración futuras
