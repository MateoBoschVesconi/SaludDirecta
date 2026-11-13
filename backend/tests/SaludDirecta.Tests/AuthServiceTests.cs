using SaludDirecta.Application.Auth;
using SaludDirecta.Application.Common;

namespace SaludDirecta.Tests;

public class AuthServiceTests
{
    private readonly RepositorioEnMemoria _repo = new();
    private readonly AuthService _servicio;

    public AuthServiceTests() =>
        _servicio = new AuthService(_repo, new HasherFalso(), new TokenFalso(), TimeProvider.System);

    private static RegistroRequest Paciente(
        string email = "ana@ejemplo.com", string password = "Password123", bool consentimiento = true) =>
        new("Ana Pérez", email, "3624123456", password, "paciente", null, null, null, consentimiento);

    private static RegistroRequest Profesional(string? matricula = "MP 3412") =>
        new("Lic. Mateo Gómez", "mateo@ejemplo.com", "3624999999", "Password123", "profesional",
            "Kinesiología", matricula, "Chaco", true);

    [Fact]
    public async Task Registrar_paciente_devuelve_token_y_guarda_hash_no_la_contrasena()
    {
        var respuesta = await _servicio.RegistrarAsync(Paciente());

        Assert.False(string.IsNullOrWhiteSpace(respuesta.Token));
        Assert.Equal("paciente", respuesta.User.Rol);
        var guardado = Assert.Single(_repo.Guardados);
        Assert.NotEqual("Password123", guardado.PasswordHash);
    }

    [Fact]
    public async Task Registrar_sin_consentimiento_se_rechaza()
    {
        await Assert.ThrowsAsync<ValidacionException>(
            () => _servicio.RegistrarAsync(Paciente(consentimiento: false)));
        Assert.Empty(_repo.Guardados);
    }

    [Fact]
    public async Task Registrar_con_contrasena_corta_se_rechaza()
    {
        await Assert.ThrowsAsync<ValidacionException>(
            () => _servicio.RegistrarAsync(Paciente(password: "corta")));
    }

    [Fact]
    public async Task Registrar_con_rol_desconocido_se_rechaza()
    {
        var request = Paciente() with { Rol = "admin" };
        await Assert.ThrowsAsync<ValidacionException>(() => _servicio.RegistrarAsync(request));
    }

    [Fact]
    public async Task Registrar_con_email_invalido_se_rechaza()
    {
        await Assert.ThrowsAsync<ValidacionException>(
            () => _servicio.RegistrarAsync(Paciente(email: "no-es-un-email")));
    }

    [Fact]
    public async Task Registrar_profesional_sin_matricula_se_rechaza()
    {
        await Assert.ThrowsAsync<ValidacionException>(
            () => _servicio.RegistrarAsync(Profesional(matricula: null)));
    }

    [Fact]
    public async Task Registrar_profesional_completo_conserva_matricula_y_jurisdiccion()
    {
        var respuesta = await _servicio.RegistrarAsync(Profesional());

        Assert.Equal("profesional", respuesta.User.Rol);
        Assert.Equal("MP 3412", respuesta.User.Matricula);
        Assert.Equal("Chaco", respuesta.User.Jurisdiccion);
    }

    [Fact]
    public async Task Registrar_con_email_repetido_ignora_mayusculas()
    {
        await _servicio.RegistrarAsync(Paciente("ana@ejemplo.com"));

        await Assert.ThrowsAsync<EmailDuplicadoException>(
            () => _servicio.RegistrarAsync(Paciente("ANA@Ejemplo.com")));
    }

    [Fact]
    public async Task Login_con_credenciales_correctas_devuelve_token()
    {
        await _servicio.RegistrarAsync(Paciente());

        var respuesta = await _servicio.LoginAsync(new LoginRequest("ana@ejemplo.com", "Password123"));

        Assert.False(string.IsNullOrWhiteSpace(respuesta.Token));
    }

    [Fact]
    public async Task Login_con_contrasena_incorrecta_se_rechaza()
    {
        await _servicio.RegistrarAsync(Paciente());

        await Assert.ThrowsAsync<CredencialesInvalidasException>(
            () => _servicio.LoginAsync(new LoginRequest("ana@ejemplo.com", "otra-clave")));
    }

    [Fact]
    public async Task Login_con_email_inexistente_da_el_mismo_error()
    {
        await Assert.ThrowsAsync<CredencialesInvalidasException>(
            () => _servicio.LoginAsync(new LoginRequest("nadie@ejemplo.com", "Password123")));
    }

    [Fact]
    public async Task ObtenerPerfil_de_usuario_inexistente_se_rechaza()
    {
        await Assert.ThrowsAsync<CredencialesInvalidasException>(
            () => _servicio.ObtenerPerfilAsync(Guid.NewGuid()));
    }
}
