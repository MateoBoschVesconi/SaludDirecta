-- ==============================================================================
-- SALUD DIRECTA - Perfil profesional, honorarios y prestaciones (HU4)
-- Ejecutar DESPUÉS de 001_usuarios.sql y 002_verificaciones.sql, en el mismo lugar
-- (pgAdmin o Supabase SQL Editor). Es idempotente: se puede correr más de una vez.
-- ==============================================================================

-- Un perfil por profesional (usuario_id es único)
create table if not exists public.perfiles_profesionales (
  id uuid primary key,
  usuario_id uuid not null unique references public.usuarios (id) on delete cascade,
  especialidad varchar(100),
  descripcion varchar(1000),
  direccion varchar(200),
  ciudad varchar(100),
  telefono varchar(40),
  honorario_consulta numeric(12, 2) check (honorario_consulta is null or honorario_consulta > 0),
  duracion_sesion_minutos integer not null default 30
    check (duracion_sesion_minutos between 5 and 240),
  tiene_rampa boolean not null default false,
  tiene_ascensor boolean not null default false,
  tiene_bano_adaptado boolean not null default false,
  publicado boolean not null default false,
  actualizado_en timestamp with time zone not null,
  -- Criterio 1 de la HU4: no se puede publicar un perfil sin el valor de la consulta
  constraint ck_perfil_publicado_con_honorario
    check (publicado = false or honorario_consulta is not null)
);

-- Cada modificación del honorario queda registrada (solo se inserta)
create table if not exists public.historial_honorarios (
  id uuid primary key,
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  valor_anterior numeric(12, 2),
  valor_nuevo numeric(12, 2) not null,
  cambiado_en timestamp with time zone not null
);

create index if not exists ix_historial_honorarios_usuario_fecha
  on public.historial_honorarios (usuario_id, cambiado_en);

-- Prestaciones que ofrece cada profesional (la baja es lógica: activa = false)
create table if not exists public.prestaciones (
  id uuid primary key,
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  nombre varchar(120) not null,
  duracion_minutos integer not null check (duracion_minutos between 5 and 480),
  activa boolean not null default true,
  creado_en timestamp with time zone not null
);

create index if not exists ix_prestaciones_usuario_activa
  on public.prestaciones (usuario_id, activa);

-- Igual que las demás tablas: RLS activado y sin políticas, para que la clave pública
-- "anon" de Supabase (la del frontend) no pueda leer ni escribir estas tablas.
alter table public.perfiles_profesionales enable row level security;
alter table public.historial_honorarios enable row level security;
alter table public.prestaciones enable row level security;
