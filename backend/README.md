# Backend – Salud Directa (API REST .NET 8)

Clean Architecture: **Domain → Application → Infrastructure → Api**.

```
backend/
├─ src/
│  ├─ SaludDirecta.Domain          Entidades y reglas de negocio (sin dependencias)
│  ├─ SaludDirecta.Application     Casos de uso e interfaces (AuthService, VerificacionService)
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

## Puesta en marcha (Windows / PowerShell)

Requisitos: **.NET 8 SDK** (`dotnet --version` debe empezar con 8) y una base PostgreSQL.

### 1. Base de datos

Ejecutá los scripts de `sql/` **en orden**: `001_usuarios.sql` y después `002_verificaciones.sql`
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
- Las tablas `usuarios`, `verificaciones_matricula` y `auditoria` tienen RLS activado sin políticas:
  la clave `anon` del frontend no puede leerlas.
- Las contraseñas se guardan con PBKDF2-HMAC-SHA256 (600.000 iteraciones) y sal aleatoria.
- No se guardan datos clínicos (RNF-02).

## Próximos pasos del plan
HU14 (middleware de auditoría general y supresión de datos), HU9 (motor de turnos con control de concurrencia),
HU11 (pagos con Mercado Pago).
