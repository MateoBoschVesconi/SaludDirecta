-- ==============================================================================
-- SALUD DIRECTA - Agenda, ausencias y turnos (HU8 y HU9)
-- Ejecutar DESPUÉS de 001, 002 y 003, en el mismo lugar (pgAdmin o Supabase SQL Editor).
-- Es idempotente: se puede correr más de una vez.
-- ==============================================================================

-- Franjas de atención por día de la semana (0 = domingo ... 6 = sábado)
create table if not exists public.franjas_horarias (
  id uuid primary key,
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  dia_semana smallint not null check (dia_semana between 0 and 6),
  hora_desde time not null,
  hora_hasta time not null,
  check (hora_hasta > hora_desde)
);

create index if not exists ix_franjas_usuario_dia
  on public.franjas_horarias (usuario_id, dia_semana);

-- Descanso entre sesiones y aviso mínimo (una fila por profesional)
create table if not exists public.configuracion_agenda (
  usuario_id uuid primary key references public.usuarios (id) on delete cascade,
  descanso_minutos integer not null default 0 check (descanso_minutos between 0 and 120),
  anticipacion_horas integer not null default 0 check (anticipacion_horas between 0 and 720)
);

-- Períodos en los que el profesional no atiende
create table if not exists public.ausencias (
  id uuid primary key,
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  desde date not null,
  hasta date not null,
  motivo varchar(200) not null,
  creado_en timestamp with time zone not null,
  check (hasta >= desde)
);

create index if not exists ix_ausencias_usuario_desde
  on public.ausencias (usuario_id, desde);

-- Turnos. inicio y fin son hora de Argentina (sin zona horaria).
create table if not exists public.turnos (
  id uuid primary key,
  profesional_id uuid not null references public.usuarios (id),
  paciente_id uuid not null references public.usuarios (id),
  prestacion_id uuid references public.prestaciones (id),
  inicio timestamp without time zone not null,
  fin timestamp without time zone not null,
  duracion_minutos integer not null check (duracion_minutos > 0),
  estado varchar(20) not null
    check (estado in ('solicitado', 'confirmado', 'cumplido', 'cancelado', 'ausente')),
  creado_en timestamp with time zone not null,
  actualizado_en timestamp with time zone not null,
  check (fin > inicio)
);

create index if not exists ix_turnos_profesional_inicio on public.turnos (profesional_id, inicio);
create index if not exists ix_turnos_paciente_inicio on public.turnos (paciente_id, inicio);

-- CONTROL DE CONCURRENCIA (criterio 1 de la HU9):
-- la base de datos misma impide que dos turnos activos (solicitado o confirmado) de un profesional
-- se superpongan. Aunque lleguen 100 solicitudes al mismo tiempo, solo una se guarda.
do $$
begin
  create extension if not exists btree_gist;

  if not exists (select 1 from pg_constraint where conname = 'ex_turnos_sin_solapamiento') then
    alter table public.turnos
      add constraint ex_turnos_sin_solapamiento
      exclude using gist (
        profesional_id with =,
        tsrange(inicio, fin, '[)') with &&
      ) where (estado in ('solicitado', 'confirmado'));
  end if;
exception when others then
  -- Plan B si el servidor no permite la extensión: al menos impide dos turnos con el mismo inicio.
  raise notice 'No se pudo crear la restricción de superposición (%). Se usa un índice único por inicio.', sqlerrm;
  create unique index if not exists ux_turnos_profesional_inicio_activo
    on public.turnos (profesional_id, inicio)
    where estado in ('solicitado', 'confirmado');
end $$;

-- Igual que las demás tablas: RLS activado y sin políticas, para que la clave pública
-- "anon" de Supabase (la del frontend) no pueda leer ni escribir estas tablas.
alter table public.franjas_horarias enable row level security;
alter table public.configuracion_agenda enable row level security;
alter table public.ausencias enable row level security;
alter table public.turnos enable row level security;
