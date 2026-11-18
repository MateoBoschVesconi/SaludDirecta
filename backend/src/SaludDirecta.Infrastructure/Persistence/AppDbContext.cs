using Microsoft.EntityFrameworkCore;
using SaludDirecta.Domain.Entities;

namespace SaludDirecta.Infrastructure.Persistence;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Usuario> Usuarios => Set<Usuario>();
    public DbSet<VerificacionMatricula> Verificaciones => Set<VerificacionMatricula>();
    public DbSet<EventoAuditoria> Auditoria => Set<EventoAuditoria>();
    public DbSet<PerfilProfesional> Perfiles => Set<PerfilProfesional>();
    public DbSet<HistorialHonorario> HistorialHonorarios => Set<HistorialHonorario>();
    public DbSet<Prestacion> Prestaciones => Set<Prestacion>();
    public DbSet<FranjaHoraria> Franjas => Set<FranjaHoraria>();
    public DbSet<Ausencia> Ausencias => Set<Ausencia>();
    public DbSet<ConfiguracionAgenda> ConfiguracionesAgenda => Set<ConfiguracionAgenda>();
    public DbSet<Turno> Turnos => Set<Turno>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Usuario>(e =>
        {
            e.ToTable("usuarios");
            e.HasKey(u => u.Id);
            e.Property(u => u.Id).HasColumnName("id").ValueGeneratedNever();
            e.Property(u => u.Nombre).HasColumnName("nombre").HasMaxLength(150).IsRequired();
            e.Property(u => u.Email).HasColumnName("email").HasMaxLength(254).IsRequired();
            e.Property(u => u.Telefono).HasColumnName("telefono").HasMaxLength(40).IsRequired();
            e.Property(u => u.PasswordHash).HasColumnName("password_hash").IsRequired();
            e.Property(u => u.Rol).HasColumnName("rol").HasMaxLength(20).IsRequired()
                .HasConversion(
                    v => v.ToString().ToLowerInvariant(),
                    v => Enum.Parse<Rol>(v, true));
            e.Property(u => u.Profesion).HasColumnName("profesion").HasMaxLength(100);
            e.Property(u => u.Matricula).HasColumnName("matricula").HasMaxLength(50);
            e.Property(u => u.Jurisdiccion).HasColumnName("jurisdiccion").HasMaxLength(100);
            e.Property(u => u.ConsentimientoAceptadoEn).HasColumnName("consentimiento_aceptado_en");
            e.Property(u => u.CreadoEn).HasColumnName("creado_en");
            e.HasIndex(u => u.Email).IsUnique();
        });

        modelBuilder.Entity<VerificacionMatricula>(e =>
        {
            e.ToTable("verificaciones_matricula");
            e.HasKey(v => v.Id);
            e.Property(v => v.Id).HasColumnName("id").ValueGeneratedNever();
            e.Property(v => v.UsuarioId).HasColumnName("usuario_id");
            e.Property(v => v.Profesion).HasColumnName("profesion").HasMaxLength(100).IsRequired();
            e.Property(v => v.Matricula).HasColumnName("matricula").HasMaxLength(50).IsRequired();
            e.Property(v => v.Jurisdiccion).HasColumnName("jurisdiccion").HasMaxLength(100).IsRequired();
            e.Property(v => v.Estado).HasColumnName("estado").HasMaxLength(20).IsRequired()
                .HasConversion(
                    v => v.ToString().ToLowerInvariant(),
                    v => Enum.Parse<EstadoVerificacion>(v, true));
            e.Property(v => v.Motivo).HasColumnName("motivo").HasMaxLength(500).IsRequired();
            e.Property(v => v.Fuente).HasColumnName("fuente").HasMaxLength(30).IsRequired();
            e.Property(v => v.VerificadaEn).HasColumnName("verificada_en");
            e.Ignore(v => v.OtorgaDistintivo);
            e.HasIndex(v => new { v.UsuarioId, v.VerificadaEn });
        });

        modelBuilder.Entity<EventoAuditoria>(e =>
        {
            e.ToTable("auditoria");
            e.HasKey(a => a.Id);
            e.Property(a => a.Id).HasColumnName("id").ValueGeneratedNever();
            e.Property(a => a.UsuarioId).HasColumnName("usuario_id");
            e.Property(a => a.Accion).HasColumnName("accion").HasMaxLength(80).IsRequired();
            e.Property(a => a.Detalle).HasColumnName("detalle").IsRequired();
            e.Property(a => a.CreadoEn).HasColumnName("creado_en");
            e.HasIndex(a => new { a.UsuarioId, a.CreadoEn });
        });

        modelBuilder.Entity<PerfilProfesional>(e =>
        {
            e.ToTable("perfiles_profesionales");
            e.HasKey(p => p.Id);
            e.Property(p => p.Id).HasColumnName("id").ValueGeneratedNever();
            e.Property(p => p.UsuarioId).HasColumnName("usuario_id");
            e.Property(p => p.Especialidad).HasColumnName("especialidad").HasMaxLength(100);
            e.Property(p => p.Descripcion).HasColumnName("descripcion").HasMaxLength(1000);
            e.Property(p => p.Direccion).HasColumnName("direccion").HasMaxLength(200);
            e.Property(p => p.Ciudad).HasColumnName("ciudad").HasMaxLength(100);
            e.Property(p => p.Telefono).HasColumnName("telefono").HasMaxLength(40);
            e.Property(p => p.HonorarioConsulta).HasColumnName("honorario_consulta").HasPrecision(12, 2);
            e.Property(p => p.DuracionSesionMinutos).HasColumnName("duracion_sesion_minutos");
            e.Property(p => p.TieneRampa).HasColumnName("tiene_rampa");
            e.Property(p => p.TieneAscensor).HasColumnName("tiene_ascensor");
            e.Property(p => p.TieneBanoAdaptado).HasColumnName("tiene_bano_adaptado");
            e.Property(p => p.Publicado).HasColumnName("publicado");
            e.Property(p => p.ActualizadoEn).HasColumnName("actualizado_en");
            e.HasIndex(p => p.UsuarioId).IsUnique();
        });

        modelBuilder.Entity<HistorialHonorario>(e =>
        {
            e.ToTable("historial_honorarios");
            e.HasKey(h => h.Id);
            e.Property(h => h.Id).HasColumnName("id").ValueGeneratedNever();
            e.Property(h => h.UsuarioId).HasColumnName("usuario_id");
            e.Property(h => h.ValorAnterior).HasColumnName("valor_anterior").HasPrecision(12, 2);
            e.Property(h => h.ValorNuevo).HasColumnName("valor_nuevo").HasPrecision(12, 2);
            e.Property(h => h.CambiadoEn).HasColumnName("cambiado_en");
            e.HasIndex(h => new { h.UsuarioId, h.CambiadoEn });
        });

        modelBuilder.Entity<Prestacion>(e =>
        {
            e.ToTable("prestaciones");
            e.HasKey(p => p.Id);
            e.Property(p => p.Id).HasColumnName("id").ValueGeneratedNever();
            e.Property(p => p.UsuarioId).HasColumnName("usuario_id");
            e.Property(p => p.Nombre).HasColumnName("nombre").HasMaxLength(120).IsRequired();
            e.Property(p => p.DuracionMinutos).HasColumnName("duracion_minutos");
            e.Property(p => p.Activa).HasColumnName("activa");
            e.Property(p => p.CreadoEn).HasColumnName("creado_en");
            e.HasIndex(p => new { p.UsuarioId, p.Activa });
        });

        modelBuilder.Entity<FranjaHoraria>(e =>
        {
            e.ToTable("franjas_horarias");
            e.HasKey(f => f.Id);
            e.Property(f => f.Id).HasColumnName("id").ValueGeneratedNever();
            e.Property(f => f.UsuarioId).HasColumnName("usuario_id");
            e.Property(f => f.DiaSemana).HasColumnName("dia_semana");
            e.Property(f => f.Desde).HasColumnName("hora_desde");
            e.Property(f => f.Hasta).HasColumnName("hora_hasta");
            e.HasIndex(f => new { f.UsuarioId, f.DiaSemana });
        });

        modelBuilder.Entity<Ausencia>(e =>
        {
            e.ToTable("ausencias");
            e.HasKey(a => a.Id);
            e.Property(a => a.Id).HasColumnName("id").ValueGeneratedNever();
            e.Property(a => a.UsuarioId).HasColumnName("usuario_id");
            e.Property(a => a.Desde).HasColumnName("desde");
            e.Property(a => a.Hasta).HasColumnName("hasta");
            e.Property(a => a.Motivo).HasColumnName("motivo").HasMaxLength(200).IsRequired();
            e.Property(a => a.CreadoEn).HasColumnName("creado_en");
            e.HasIndex(a => new { a.UsuarioId, a.Desde });
        });

        modelBuilder.Entity<ConfiguracionAgenda>(e =>
        {
            e.ToTable("configuracion_agenda");
            e.HasKey(c => c.UsuarioId);
            e.Property(c => c.UsuarioId).HasColumnName("usuario_id").ValueGeneratedNever();
            e.Property(c => c.DescansoEntreSesionesMinutos).HasColumnName("descanso_minutos");
            e.Property(c => c.AnticipacionMinimaHoras).HasColumnName("anticipacion_horas");
        });

        modelBuilder.Entity<Turno>(e =>
        {
            e.ToTable("turnos");
            e.HasKey(t => t.Id);
            e.Property(t => t.Id).HasColumnName("id").ValueGeneratedNever();
            e.Property(t => t.ProfesionalId).HasColumnName("profesional_id");
            e.Property(t => t.PacienteId).HasColumnName("paciente_id");
            e.Property(t => t.PrestacionId).HasColumnName("prestacion_id");
            e.Property(t => t.Inicio).HasColumnName("inicio").HasColumnType("timestamp without time zone");
            e.Property(t => t.Fin).HasColumnName("fin").HasColumnType("timestamp without time zone");
            e.Property(t => t.DuracionMinutos).HasColumnName("duracion_minutos");
            e.Property(t => t.Estado).HasColumnName("estado").HasMaxLength(20).IsRequired()
                .HasConversion(
                    v => v.ToString().ToLowerInvariant(),
                    v => Enum.Parse<EstadoTurno>(v, true));
            e.Property(t => t.CreadoEn).HasColumnName("creado_en");
            e.Property(t => t.ActualizadoEn).HasColumnName("actualizado_en");
            e.Ignore(t => t.OcupaHorario);
            e.HasIndex(t => new { t.ProfesionalId, t.Inicio });
            e.HasIndex(t => new { t.PacienteId, t.Inicio });
        });
    }
}
