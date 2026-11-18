using Microsoft.EntityFrameworkCore;
using SaludDirecta.Domain.Entities;

namespace SaludDirecta.Infrastructure.Persistence;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Usuario> Usuarios => Set<Usuario>();

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
    }
}
