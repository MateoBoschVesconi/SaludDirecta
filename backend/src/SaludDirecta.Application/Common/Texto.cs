using System.Text;

namespace SaludDirecta.Application.Common;

/// <summary>Normalización de textos para compararlos sin depender de mayúsculas, tildes ni formato.</summary>
public static class Texto
{
    private static readonly Dictionary<char, char> Tildes = new()
    {
        ['á'] = 'a', ['à'] = 'a', ['ä'] = 'a', ['â'] = 'a',
        ['é'] = 'e', ['è'] = 'e', ['ë'] = 'e', ['ê'] = 'e',
        ['í'] = 'i', ['ì'] = 'i', ['ï'] = 'i', ['î'] = 'i',
        ['ó'] = 'o', ['ò'] = 'o', ['ö'] = 'o', ['ô'] = 'o',
        ['ú'] = 'u', ['ù'] = 'u', ['ü'] = 'u', ['û'] = 'u',
        ['ñ'] = 'n'
    };

    /// <summary>"  Kinesiología " y "kinesiologia" dan el mismo resultado.</summary>
    public static string Normalizar(string? texto)
    {
        if (string.IsNullOrWhiteSpace(texto)) return string.Empty;

        var sb = new StringBuilder(texto.Length);
        foreach (var original in texto.Trim().ToLowerInvariant())
            sb.Append(Tildes.TryGetValue(original, out var sinTilde) ? sinTilde : original);

        return string.Join(' ', sb.ToString().Split(' ', StringSplitOptions.RemoveEmptyEntries));
    }

    /// <summary>"MP 3412", "mp-3412" y "MP3412" dan el mismo resultado: MP3412.</summary>
    public static string NormalizarMatricula(string? matricula) =>
        new((matricula ?? string.Empty)
            .Where(char.IsLetterOrDigit)
            .Select(char.ToUpperInvariant)
            .ToArray());

    /// <summary>Unifica las distintas formas de nombrar a la Ciudad de Buenos Aires.</summary>
    public static string NormalizarJurisdiccion(string? jurisdiccion)
    {
        var normalizada = Normalizar(jurisdiccion);
        return normalizada is "caba" or "c.a.b.a." or "capital federal"
            or "ciudad autonoma de buenos aires" or "ciudad de buenos aires"
            ? "caba"
            : normalizada;
    }
}
