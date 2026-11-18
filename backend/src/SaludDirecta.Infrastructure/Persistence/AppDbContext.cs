using Microsoft.EntityFrameworkCore;
using SaludDirecta.Domain.Entities;

namespace SaludDirecta.Infrastructure.Persistence;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Usuario> Usuarios => Set<Usuario>();
    public DbSet<VerificacionMatricula> Verificaciones => Set<VerificacionMatricula>();
    public DbSet<EventoAuditoria> Auditoria => Set<EventoAuditoria>();

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
    }
}
