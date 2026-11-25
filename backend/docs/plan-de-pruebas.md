# Plan de pruebas del backend (HU15)

Salud Directa, API .NET 8. Este documento resume qué se prueba, cómo se ejecuta y qué cobertura se midió.

## 1. Estrategia

| Nivel | Qué cubre | Cómo se ejecuta |
|---|---|---|
| Unitarias de dominio | Reglas de las entidades (estados del turno, honorarios, anonimización, notificaciones, etc.) | `dotnet test` |
| Servicios de aplicación | Casos de uso completos con repositorios en memoria (registro, verificación, agenda, reserva, avisos, borrado de cuenta) | `dotnet test` |
| Modelo y privacidad | Reglas transversales comprobadas por reflexión (sin datos clínicos, bitácora sin operaciones de cambio) | `dotnet test` |
| Concurrencia | 100 reservas simultáneas del mismo horario: 1 creada y 99 rechazadas con 409, usando la restricción de exclusión de PostgreSQL | `scripts/prueba-carga-turnos.ps1` con la API y la base corriendo |
| Manual (Swagger) | Flujos completos contra la base real, códigos HTTP y mensajes de error | Lista de la sección 4 |

Las pruebas automáticas no usan base de datos ni red: los repositorios son fakes en memoria (`Fakes.cs`) y el reloj es fijo.
Por eso los repositorios de Infraestructura (EF Core) no figuran en la cobertura; se verifican con las pruebas manuales y de carga.

## 2. Trazabilidad entre historias de usuario y pruebas

| HU | Funcionalidad | Archivo de pruebas | Clases |
|---|---|---|---|
| HU1 | Registro, login, JWT, contraseñas | `AuthServiceTests.cs`, `Pbkdf2PasswordHasherTests.cs` | AuthServiceTests, Pbkdf |
| HU2 | Verificación de matrícula (cadena de verificación, REFEPS simulado) | `VerificacionTests.cs` | CadenaVerificacionTests, VerificacionServiceTests, RegistroProfesionalesSimuladoTests |
| HU4 | Perfil, honorarios con historial, prestaciones | `PerfilTests.cs` | PerfilProfesionalTests, PrestacionTests, PerfilServiceTests, PrestacionServiceTests |
| HU8 | Agenda, franjas, ausencias, generación de horarios | `AgendaTurnosTests.cs` | GeneradorHorariosTests, AgendaServiceTests |
| HU9 | Reserva y estados del turno, turno ocupado | `AgendaTurnosTests.cs` | TurnoDominioTests, TurnoServiceTests |
| HU10 | Avisos, recordatorios, envío con reintentos, bandeja | `NotificacionesTests.cs` | NotificacionDominioTests, NotificacionesDeTurnoTests, EnvioNotificacionesTests, BandejaDeNotificacionesTests |
| HU14 | Acceso y supresión de datos, anonimización, bitácora, sin datos clínicos | `CuentaTests.cs` | UsuarioAnonimizacionTests, CuentaServiceTests, PrivacidadDelModeloTests |

Requisitos no funcionales cubiertos por pruebas automáticas:

| RNF | Prueba |
|---|---|
| RNF-02 (sin datos clínicos) | `PrivacidadDelModeloTests.RNF02_ninguna_entidad_guarda_datos_clinicos_ni_diagnosticos` |
| RNF-04 (bitácora inmutable) | `PrivacidadDelModeloTests` (el código no ofrece forma de modificarla) y los triggers de `sql/006_privacidad.sql` (se comprueban a mano) |
| RNF-09 (cobertura de reglas de dominio de al menos 70%) | Medición de la sección 3 |

## 3. Cobertura medida

Medición del 24/11/2026 con 213 pruebas, 0 fallidas.

| Indicador | Resultado |
|---|---|
| Cobertura de líneas total | 73,5% (1327 de 1803 líneas cubribles) |
| Cobertura de ramas total | 86,5% (430 de 497) |
| Dominio (reglas de negocio) | 97,8% |
| Infraestructura | 9,4% (los repositorios EF y el generador de tokens requieren base de datos; se prueban a mano y con la prueba de carga) |

El objetivo del RNF-09 (al menos 70% en reglas de dominio) se cumple con amplio margen.

Cómo repetir la medición, desde la carpeta `backend`:
```powershell
dotnet test --collect:"XPlat Code Coverage"
dotnet tool install -g dotnet-reportgenerator-globaltool
reportgenerator -reports:"tests\SaludDirecta.Tests\TestResults\*\coverage.cobertura.xml" -targetdir:coveragereport -reporttypes:TextSummary
type coveragereport\Summary.txt
```
Para un reporte navegable, cambiar `TextSummary` por `Html` y abrir `coveragereport\index.html`.
Las carpetas `TestResults` y `coveragereport` no se suben al repositorio.

## 4. Lista de pruebas manuales (Swagger)

Preparación: ejecutar los scripts `sql/001` a `sql/006`, arrancar la API con `dotnet run --project src\SaludDirecta.Api` y abrir `http://localhost:5000/swagger`.

| # | Caso | Resultado esperado |
|---|---|---|
| 1 | Registrar paciente sin aceptar el consentimiento | 400 |
| 2 | Registrar un paciente y repetir el mismo correo | 201 la primera vez, 409 la segunda |
| 3 | Login con contraseña incorrecta | 401 |
| 4 | Login correcto y `GET /api/auth/me` con el token | 200 con los datos del usuario |
| 5 | Registrar profesional con matrícula válida del padrón simulado | Cuenta verificada con distintivo |
| 6 | Cambiar honorario del profesional y consultar el historial | El historial conserva el valor anterior |
| 7 | Crear franjas de agenda y consultar horarios libres | Horarios generados según duración de sesión |
| 8 | Reservar un turno y repetir la reserva del mismo horario | 201 y luego 409 |
| 9 | Confirmar y cancelar un turno desde el profesional | Estados válidos; transición inválida da 400 |
| 10 | Ver `GET /api/notificaciones/me` tras reservar | Aviso para paciente y profesional |
| 11 | Prueba de carga `scripts/prueba-carga-turnos.ps1` | 1 turno creado y 99 rechazados con 409 |
| 12 | `GET /api/cuenta/me/datos` | Datos propios de cuenta, perfil, turnos y avisos |
| 13 | `DELETE /api/cuenta/me` con contraseña incorrecta | 400 y la cuenta sigue activa |
| 14 | `DELETE /api/cuenta/me` con la contraseña correcta | 200, turnos activos cancelados |
| 15 | Usar el token de la cuenta borrada | 401 |
| 16 | En pgAdmin: `delete from auditoria;` | Error "La bitácora de auditoría no se puede modificar" |
| 17 | Más de 10 intentos de login en un minuto | 429 |

## 5. Pendientes

- Las pruebas de accesibilidad WCAG corresponden al frontend.
- Pruebas de integración automáticas con una base real (por ejemplo con Testcontainers) quedan como mejora futura.
