<#
  Prueba de carga de la HU9 (criterio 4): lanza muchas reservas simultáneas para el MISMO horario
  y comprueba que no hay doble asignación. Resultado esperado: 1 respuesta 201 y el resto 409.

  Uso (con la API corriendo):
    .\scripts\prueba-carga-turnos.ps1 -Token "<token de un paciente>" -ProfesionalId "<id>" -Fecha "2026-11-23" -Hora "09:00"
#>
param(
    [Parameter(Mandatory = $true)][string]$Token,
    [Parameter(Mandatory = $true)][string]$ProfesionalId,
    [Parameter(Mandatory = $true)][string]$Fecha,
    [Parameter(Mandatory = $true)][string]$Hora,
    [int]$Cantidad = 100,
    [string]$BaseUrl = "http://localhost:5000"
)

Add-Type -AssemblyName System.Net.Http
$cliente = New-Object System.Net.Http.HttpClient
$cliente.DefaultRequestHeaders.Authorization = New-Object System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", $Token)

$cuerpo = @{ profesionalId = $ProfesionalId; fecha = $Fecha; hora = $Hora } | ConvertTo-Json

Write-Host "Lanzando $Cantidad reservas simultáneas para el $Fecha a las $Hora..."
$cronometro = [System.Diagnostics.Stopwatch]::StartNew()

$tareas = @(1..$Cantidad | ForEach-Object {
    $contenido = New-Object System.Net.Http.StringContent($cuerpo, [System.Text.Encoding]::UTF8, "application/json")
    $cliente.PostAsync("$BaseUrl/api/turnos", $contenido)
})
[System.Threading.Tasks.Task]::WaitAll([System.Threading.Tasks.Task[]]$tareas)
$cronometro.Stop()

$codigos = $tareas | ForEach-Object { [int]$_.Result.StatusCode }
Write-Host ("Tiempo total: {0} ms" -f $cronometro.ElapsedMilliseconds)
$codigos | Group-Object | Sort-Object Name | ForEach-Object {
    Write-Host ("  HTTP {0}: {1} respuestas" -f $_.Name, $_.Count)
}

$creados = ($codigos | Where-Object { $_ -eq 201 }).Count
if ($creados -eq 1) {
    Write-Host "OK: se creó un solo turno. No hubo doble asignación." -ForegroundColor Green
} else {
    Write-Host "ERROR: se crearon $creados turnos para el mismo horario." -ForegroundColor Red
}
