# Backend – Salud Directa (API REST .NET 8)

Clean Architecture: **Domain → Application → Infrastructure → Api**.

```
backend/
├─ src/
│  ├─ SaludDirecta.Domain          Entidades y reglas de negocio (sin dependencias)
│  ├─ SaludDirecta.Application     Casos de uso e interfaces (AuthService)
│  ├─ SaludDirecta.Infrastructure  EF Core + PostgreSQL, hash PBKDF2, emisión de JWT
│  └─ SaludDirecta.Api             Controllers, JWT, CORS, Swagger
├─ tests/SaludDirecta.Tests        xUnit
├─ sql/001_usuarios.sql            Tabla `usuarios`
└─ docker-compose.yml              Postgres local (opcional)
```

## Estado actual: HU1 (registro y login)

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

## Puesta en marcha (Windows / PowerShell)

Requisitos: **.NET 8 SDK** (`dotnet --version` debe empezar con 8) y una base PostgreSQL.

### 1. Base de datos (elegí una)

**A) Docker (local):**
```powershell
cd backend
docker compose up -d
```
Crea la base `saluddirecta` y ejecuta `sql/001_usuarios.sql` automáticamente.
`appsettings.Development.json` ya apunta a ese Postgres.

**B) Supabase:** ejecutá `sql/001_usuarios.sql` en *SQL Editor* y guardá la cadena de conexión
(Project Settings → Database → Connection string) como secreto, **sin commitearla**:
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
- La tabla `usuarios` tiene RLS activado sin políticas: la clave `anon` del frontend no puede leer los hashes.
- Las contraseñas se guardan con PBKDF2-HMAC-SHA256 (600.000 iteraciones) y sal aleatoria.
- No se guardan datos clínicos (RNF-02).

## Próximos pasos del plan
HU14 (auditoría + supresión de datos), HU2 (verificación de matrícula REFEPS tras un Adapter),
HU9 (motor de turnos con control de concurrencia).
