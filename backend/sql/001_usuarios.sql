-- ==============================================================================
-- SALUD DIRECTA - Tabla de usuarios (HU1: registro e inicio de sesión)
-- Ejecutar en: Supabase -> SQL Editor, o contra el Postgres local (docker-compose).
-- Es idempotente: se puede correr más de una vez.
-- ==============================================================================

create table if not exists public.usuarios (
  id uuid primary key,
  nombre varchar(150) not null,
  email varchar(254) not null,
  telefono varchar(40) not null,
  password_hash text not null,
  rol varchar(20) not null check (rol in ('paciente', 'profesional')),
  profesion varchar(100),
  matricula varchar(50),
  jurisdiccion varchar(100),
  consentimiento_aceptado_en timestamp with time zone not null,
  creado_en timestamp with time zone not null,
  -- un profesional debe tener profesión, matrícula y jurisdicción
  constraint usuarios_profesional_datos check (
    rol <> 'profesional'
    or (profesion is not null and matricula is not null and jurisdiccion is not null)
  )
);

-- El correo es único (el backend lo guarda siempre en minúsculas)
create unique index if not exists ix_usuarios_email on public.usuarios (email);

-- IMPORTANTE (seguridad): esta tabla guarda hashes de contraseñas.
-- Con RLS activado y SIN políticas, la clave pública "anon" de Supabase que usa
-- el frontend NO puede leerla ni escribirla. El backend se conecta con el rol
-- postgres (cadena de conexión directa), que no queda sujeto a RLS.
alter table public.usuarios enable row level security;
