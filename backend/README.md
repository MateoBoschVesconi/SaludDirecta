# Backend – Salud Directa (API REST .NET 8)

Clean Architecture: **Domain → Application → Infrastructure → Api**.

```
backend/
├─ src/
│  ├─ SaludDirecta.Domain          Entidades y reglas de negocio (sin dependencias)
│  ├─ SaludDirecta.Application     Casos de uso e interfaces (AuthService, VerificacionService, PerfilService, PrestacionService, AgendaService, TurnoService)
│  ├─ SaludDirecta.Infrastructure  EF Core + PostgreSQL, hash PBKDF2, JWT, adapter del registro oficial
│  └─ SaludDirecta.Api             Controllers, JWT, CORS, Swagger
├─ tests/SaludDirecta.Tests        xUnit
├─ sql/                            Scripts de base de datos (ejecutar en orden)
└─ docker-compose.yml              Postgres local (opcional)
```

## Endpoints

### HU1 – Registro y login

| Endpoint | Acceso | Descripción |
| :--- | :--- | :--- |
| `POST /api/auth/register` | público | Alta de paciente o profesional. Exige `consentimientoAceptado: true` (Ley 25.326). |
| `POST /api/auth/login` | público | Devuelve `{ token, expiraEnUtc, user }`. |
| `GET /api/auth/me` | JWT | Perfil del usuario autenticado. |

El objeto `user` usa los mismos nombres que `AuthContext.jsx` del frontend
(`nombre`, `email`, `telefono`, `rol`, `profesion`, `matricula`, `jurisdiccion`, `consentAcceptedAt`).
El rol viaja también como claim `role` dentro del JWT (`paciente` / `profesional`).

Ejemplo de registro:

```json
{
  "nombre": "Ana Pérez",
  "email": "ana@ejemplo.com",
  "telefono": "3624123456",
  "password": "Password123",
  "rol": "paciente",
  "consentimientoAceptado": true
}
```

Un profesional agrega `"rol": "profesional"`, `profesion`, `matricula` y `jurisdiccion`.

### HU2 – Verificación de matrícula

| Endpoint | Acceso | Descripción |
| :--- | :--- | :--- |
| `POST /api/profesionales/me/verificacion` | JWT, rol `profesional` | Verifica la matrícula declarada al registrarse contra el registro oficial. |
| `GET /api/profesionales/me/verificacion` | JWT, rol `profesional` | Estado de la última verificación. |
| `GET /api/profesionales/{id}/distintivo` | público | `{ verificado, verificadaEn }` para mostrar el distintivo en el perfil. |

Respuesta de la verificación: `{ estado, distintivo, motivo, fuente, verificadaEn }`.

| `estado` | Cuándo | ¿Distintivo? |
| :--- | :--- | :--- |
| `verificada` | Habilitada en el registro y con profesión y jurisdicción coincidentes | Sí |
| `revision_manual` | No se encontró, el servicio no respondió, o no coincide la profesión/jurisdicción | No |
| `rechazada` | El registro la informa como no habilitada | No |
| `sin_verificar` | (solo en el `GET`) todavía no se pidió verificación | No |

Cómo funciona por dentro:
- **Adapter:** la aplicación solo conoce la interfaz `IRegistroProfesionales`. Hoy se usa
  `RegistroProfesionalesSimulado`, que lee un padrón de prueba desde `appsettings.Development.json`
  (sección `Refeps:PadronSimulado`). Para usar el servicio real de REFEPS/SISA hay que escribir una clase
  que implemente esa interfaz y cambiar una línea en `Infrastructure/DependencyInjection.cs`.
- **Pasos encadenados:** consultar el registro → comprobar habilitación → comprobar coincidencia
  (`CadenaVerificacion`). El primer paso que concluye decide el resultado.
- **Auditoría:** cada verificación guarda un registro en `verificaciones_matricula` y un evento en `auditoria`,
  en una sola operación.
- La comparación ignora mayúsculas y tildes, y reconoce a la Ciudad de Buenos Aires como CABA.

Padrón de prueba (Swagger): `MP 3412` Kinesiología/Chaco (habilitada), `MP 2210` Nutrición/Chaco (habilitada),
`MP 1875` Psicología/Chaco (**no** habilitada), `MP 5000` Nutrición/Corrientes (habilitada).
La matrícula `SIN-SERVICIO` simula que el registro oficial está caído. Cualquier otra no se encuentra.

**Pendiente de HU2:** el paso de "revisión manual" solo marca el caso; todavía no hay un rol de administrador
ni una pantalla para resolverlo. Tampoco está el cliente real de REFEPS/SISA (necesita credenciales).

### HU4 – Perfil profesional, honorarios y prestaciones

Todos los endpoints `me/...` requieren JWT con rol `profesional`.

| Endpoint | Acceso | Descripción |
| :--- | :--- | :--- |
| `GET /api/profesionales/me/perfil` | JWT, `profesional` | Perfil propio (vacío si todavía no lo completó). Incluye el estado de verificación. |
| `PUT /api/profesionales/me/perfil` | JWT, `profesional` | Crea o actualiza especialidad, descripción, dirección, ciudad, teléfono, duración de la sesión y accesibilidad. |
| `PUT /api/profesionales/me/perfil/honorario` | JWT, `profesional` | Fija o modifica el honorario de la consulta. Cada cambio queda en el historial y en la auditoría. |
| `POST /api/profesionales/me/perfil/publicar` | JWT, `profesional` | Publica el perfil. Responde 400 si todavía no tiene honorario. |
| `POST /api/profesionales/me/perfil/despublicar` | JWT, `profesional` | Oculta el perfil. |
| `GET /api/profesionales/me/perfil/honorarios/historial` | JWT, `profesional` | Cambios de honorario, del más reciente al más antiguo (`valorAnterior`, `valorNuevo`, `cambiadoEn`). |
| `GET /api/profesionales/me/prestaciones` | JWT, `profesional` | Prestaciones activas propias. |
| `POST /api/profesionales/me/prestaciones` | JWT, `profesional` | Alta de prestación (`nombre`, `duracionMinutos`). Responde 201. |
| `PUT /api/profesionales/me/prestaciones/{id}` | JWT, `profesional` | Modifica una prestación propia. |
| `DELETE /api/profesionales/me/prestaciones/{id}` | JWT, `profesional` | Baja lógica (204). Si es de otro profesional responde 404. |
| `GET /api/profesionales/{id}/perfil` | público | Vista pública: datos, honorario, prestaciones y estado de verificación. 404 si no existe o no está publicado. |

`{id}` es el `id` del usuario profesional (el mismo que devuelve el login).

Reglas (criterios de aceptación del plan):
1. **No se puede publicar sin el valor de la consulta.** Lo controla el dominio y además un `check` en la base de datos.
2. **Cada modificación del honorario queda registrada** en `historial_honorarios` (valor anterior y nuevo) y en `auditoria` con la acción `MODIFICACION_HONORARIOS` (RNF-04). Si se repite el mismo valor no se registra nada.
3. **El perfil público muestra el honorario y el estado de verificación** (`verificado` y `verificadaEn`, tomados de la HU2).

Notas:
- El honorario tiene su propio endpoint a propósito: así el historial y la auditoría no dependen de cómo se arme el formulario del frontend. Al guardar la pantalla de perfil, el frontend llama a `PUT me/perfil` y, si cambió el precio, a `PUT me/perfil/honorario`.
- Las prestaciones se dan de baja de forma lógica (`activa = false`) para no romper turnos futuros que las usen (HU8 y HU9).

### HU8 – Agenda y disponibilidad / HU9 – Reserva de turnos

**Agenda del profesional** (JWT con rol `profesional`):

| Endpoint | Descripción |
| :--- | :--- |
| `GET /api/profesionales/me/agenda` | Franjas semanales y ajustes de la agenda. |
| `PUT /api/profesionales/me/agenda` | Reemplaza toda la disponibilidad. Cuerpo: `franjas` (`diaSemana`, `desde`, `hasta`), `descansoEntreSesionesMinutos`, `anticipacionMinimaHoras`. |
| `GET /api/profesionales/me/ausencias` | Períodos de ausencia. |
| `POST /api/profesionales/me/ausencias` | Alta de ausencia (`desde`, `hasta`, `motivo`). Responde 201. |
| `DELETE /api/profesionales/me/ausencias/{id}` | Elimina una ausencia propia (204). |
| `GET /api/profesionales/{id}/horarios-disponibles?fecha=2026-11-23&prestacionId=...` | **Público.** Horarios libres de un profesional publicado. |

Formatos: `diaSemana` va de 0 (domingo) a 6 (sábado), igual que `getDay()` de JavaScript. Las horas van como `"HH:mm"` y las fechas como `"yyyy-MM-dd"`. Las horas son las del consultorio (Argentina, UTC-3).
Una jornada partida (mañana y tarde) se carga como dos franjas del mismo día.

Reglas (criterios del plan): solo se ofrecen horarios dentro de las franjas; las ausencias bloquean la reserva; la duración del turno es la de la prestación elegida (o la duración de sesión del perfil si no se elige ninguna). Los horarios se arman cada `duración + descanso` minutos desde el inicio de cada franja, y no se ofrece nada anterior a ahora + la anticipación mínima.

**Turnos** (JWT):

| Endpoint | Acceso | Descripción |
| :--- | :--- | :--- |
| `POST /api/turnos` | `paciente` | Reserva. Cuerpo: `profesionalId`, `fecha`, `hora`, `prestacionId` (opcional). Responde 201 con el turno en estado `solicitado`, o **409** si el horario ya fue tomado. |
| `GET /api/turnos/me` | paciente o profesional | Mis turnos, ordenados por fecha. |
| `GET /api/turnos/{id}` | paciente o profesional del turno | Estado y datos del turno. Para cualquier otro usuario responde 404. |
| `POST /api/turnos/{id}/estado` | paciente o profesional del turno | Cuerpo: `{ "estado": "confirmado" }`. El paciente solo puede `cancelado`. |

Estados (RF-11): `solicitado` → `confirmado` o `cancelado`; `confirmado` → `cumplido`, `ausente` o `cancelado`. `cumplido`, `ausente` y `cancelado` son finales. Una transición inválida responde 400.

**Control de concurrencia.** La garantía final está en la base de datos: `sql/004_agenda_turnos.sql` crea una restricción de exclusión (`ex_turnos_sin_solapamiento`) que impide que dos turnos activos (solicitado o confirmado) del mismo profesional se superpongan. Si dos solicitudes llegan en el mismo instante, PostgreSQL deja pasar una y rechaza la otra, y la API la convierte en un 409. Cancelar un turno libera el horario.

Prueba de carga (100 solicitudes simultáneas al mismo horario; esperado: un 201 y 99 respuestas 409), con la API corriendo:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\prueba-carga-turnos.ps1 -Token "<token de un paciente>" -ProfesionalId "<id del profesional>" -Fecha "2026-11-23" -Hora "09:00"
```
Además hay un test automático (`Cien_solicitudes_simultaneas_para_el_mismo_horario_dejan_un_solo_turno`) que comprueba que la lógica de reserva deja un solo turno.

Pendiente: los recordatorios y notificaciones (HU10), el cobro (HU11) y la pantalla de "Mis turnos" conectada a esta API.

## Puesta en marcha (Windows / PowerShell)

Requisitos: **.NET 8 SDK** (`dotnet --version` debe empezar con 8) y una base PostgreSQL.

### 1. Base de datos

Ejecutá los scripts de `sql/` **en orden**: `001_usuarios.sql`, `002_verificaciones.sql`, `003_perfiles.sql` y `004_agenda_turnos.sql`
(en pgAdmin: clic derecho en la base → Query Tool → abrir archivo → F5).

**A) PostgreSQL instalado en tu PC.** `appsettings.Development.json` espera usuario `postgres`,
contraseña `postgres` y base `saluddirecta`.

**B) Docker:** `docker compose up -d` dentro de `backend`. Ejecuta los scripts automáticamente,
pero solo la primera vez que se crea el volumen.

**C) Supabase:** ejecutá los scripts en *SQL Editor* y guardá la cadena de conexión como secreto,
**sin commitearla**:
```powershell
cd backend\src\SaludDirecta.Api
dotnet user-secrets set "ConnectionStrings:Default" "Host=db.XXXX.supabase.co;Port=5432;Database=postgres;Username=postgres;Password=TU_PASSWORD;SSL Mode=Require;Trust Server Certificate=true"
```

### 2. Ejecutar la API
```powershell
cd backend
dotnet restore
dotnet build
dotnet run --project src\SaludDirecta.Api
```
Swagger: <http://localhost:5000/swagger> (es la URL que ya espera el frontend: `VITE_API_URL=http://localhost:5000/api`).

### 3. Pruebas
```powershell
dotnet test
```

## Notas de seguridad
- `appsettings.Development.json` trae una clave JWT **solo para desarrollo**. En producción definí `Jwt__Key`
  (mínimo 32 caracteres) y `ConnectionStrings__Default` como variables de entorno.
- Las tablas `usuarios`, `verificaciones_matricula`, `auditoria`, `perfiles_profesionales`, `historial_honorarios`, `prestaciones`, `franjas_horarias`, `configuracion_agenda`, `ausencias` y `turnos` tienen RLS activado sin políticas:
  la clave `anon` del frontend no puede leerlas.
- Las contraseñas se guardan con PBKDF2-HMAC-SHA256 (600.000 iteraciones) y sal aleatoria.
- No se guardan datos clínicos (RNF-02).

## Próximos pasos del plan
HU14 (middleware de auditoría general y supresión de datos), HU9 (motor de turnos con control de concurrencia),
HU11 (pagos con Mercado Pago).
