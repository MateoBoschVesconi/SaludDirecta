-- ==============================================================================
-- SALUD DIRECTA - Verificación de matrículas y auditoría (HU2)
-- Ejecutar DESPUÉS de 001_usuarios.sql, en el mismo lugar (pgAdmin o Supabase SQL Editor).
-- Es idempotente: se puede correr más de una vez.
-- ==============================================================================

-- Una fila por cada verificación pedida (queda el historial completo)
create table if not exists public.verificaciones_matricula (
  id uuid primary key,
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  profesion varchar(100) not null,
  matricula varchar(50) not null,
  jurisdiccion varchar(100) not null,
  estado varchar(20) not null check (estado in ('verificada', 'revisionmanual', 'rechazada')),
  motivo varchar(500) not null,
  fuente varchar(30) not null,
  verificada_en timestamp with time zone not null
);

create index if not exists ix_verificaciones_usuario_fecha
  on public.verificaciones_matricula (usuario_id, verificada_en);

-- Bitácora de auditoría: solo se inserta, no se modifica ni se borra.
-- No tiene clave foránea a usuarios a propósito: debe sobrevivir si el usuario se elimina.
create table if not exists public.auditoria (
  id uuid primary key,
  usuario_id uuid,
  accion varchar(80) not null,
  detalle text not null,
  creado_en timestamp with time zone not null
);

create index if not exists ix_auditoria_usuario_fecha
  on public.auditoria (usuario_id, creado_en);

-- Igual que `usuarios`: RLS activado y sin políticas, para que la clave pública
-- "anon" de Supabase (la del frontend) no pueda leer ni escribir estas tablas.
alter table public.verificaciones_matricula enable row level security;
alter table public.auditoria enable row level security;
