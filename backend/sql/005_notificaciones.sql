-- ==============================================================================
-- SALUD DIRECTA - Notificaciones y recordatorios de turnos (HU10)
-- Ejecutar DESPUÉS de 001, 002, 003 y 004, en el mismo lugar (pgAdmin o Supabase SQL Editor).
-- Es idempotente: se puede correr más de una vez.
-- ==============================================================================

create table if not exists public.notificaciones (
  id uuid primary key,
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  turno_id uuid not null references public.turnos (id) on delete cascade,
  tipo varchar(30) not null
    check (tipo in ('turnosolicitado', 'turnoconfirmado', 'turnocancelado', 'recordatorio')),
  asunto varchar(150) not null,
  mensaje varchar(1000) not null,
  estado varchar(20) not null
    check (estado in ('pendiente', 'enviada', 'cancelada', 'fallida')),
  programada_para timestamptz not null,
  intentos integer not null default 0,
  enviada_en timestamptz,
  leida_en timestamptz,
  creado_en timestamptz not null
);

create index if not exists ix_notificaciones_usuario_creado
  on public.notificaciones (usuario_id, creado_en desc);

-- Las que el servicio de envíos busca en cada vuelta
create index if not exists ix_notificaciones_estado_programada
  on public.notificaciones (estado, programada_para);

create index if not exists ix_notificaciones_turno
  on public.notificaciones (turno_id);

-- Igual que las demás tablas: RLS activado y sin políticas, para que la clave pública
-- "anon" de Supabase (la del frontend) no pueda leer ni escribir esta tabla.
alter table public.notificaciones enable row level security;
