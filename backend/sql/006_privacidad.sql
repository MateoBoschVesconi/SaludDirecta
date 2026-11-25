-- HU14: privacidad y seguridad.
-- Ejecutar en pgAdmin sobre la base saluddirecta, después de 005_notificaciones.sql. Se puede correr más de una vez.

-- 1) Derecho de supresión (Ley 25.326): la cuenta eliminada queda anonimizada y marcada.
alter table public.usuarios
  add column if not exists eliminado_en timestamptz;

-- 2) Bitácora inmutable (RNF-04): ni el sistema ni una persona con acceso común pueden cambiar o borrar eventos.
create or replace function public.auditoria_inmutable() returns trigger
language plpgsql as $$
begin
  raise exception 'La bitácora de auditoría no se puede modificar ni borrar (operación % rechazada)', tg_op
    using errcode = '42501';
end;
$$;

drop trigger if exists auditoria_sin_cambios on public.auditoria;
create trigger auditoria_sin_cambios
  before update or delete on public.auditoria
  for each row execute function public.auditoria_inmutable();

drop trigger if exists auditoria_sin_vaciar on public.auditoria;
create trigger auditoria_sin_vaciar
  before truncate on public.auditoria
  for each statement execute function public.auditoria_inmutable();
