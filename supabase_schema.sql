-- ==============================================================================
-- SALUD DIRECTA - SCHEMA PARA SUPABASE
-- Ejecuta este script en: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. Crear tabla de Profesionales
create table if not exists public.professionals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  specialty text not null,
  registry text not null,
  price numeric not null,
  description text,
  location text not null default 'Resistencia, Chaco',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Crear tabla de Reservas / Turnos
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid references public.professionals(id) on delete set null,
  professional_name text,
  specialty text,
  patient_name text default 'Paciente Particular',
  patient_phone text,
  patient_email text,
  date text not null,
  time text not null,
  total_price numeric not null,
  status text not null default 'confirmed',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Índice de unicidad para evitar reservas duplicadas en el mismo día y horario
-- (Impide que dos pacientes reserven el mismo horario para el mismo profesional)
create unique index if not exists unique_active_appointment_idx 
  on public.appointments (professional_name, date, time) 
  where (status != 'cancelled');

-- 4. Habilitar Row Level Security (RLS)
alter table public.professionals enable row level security;
alter table public.appointments enable row level security;

-- 5. Políticas de acceso (RLS)
-- Permitir que cualquier usuario (anónimo o logueado) consulte la lista de profesionales
create policy "Lectura publica de profesionales"
  on public.professionals
  for select
  to anon, authenticated
  using (true);

-- Permitir a los pacientes crear reservas de turnos
create policy "Permitir crear turnos"
  on public.appointments
  for insert
  to anon, authenticated
  with check (true);

-- Permitir que se puedan consultar los turnos registrados
create policy "Permitir lectura de turnos"
  on public.appointments
  for select
  to anon, authenticated
  using (true);

-- 6. Cargar datos iniciales de prueba (Seed Data)
insert into public.professionals (name, specialty, registry, price, description, location)
values
  (
    'Lic. Mateo Gómez',
    'Kinesiología y Fisiatría',
    'MP 3412',
    25000,
    'Especialista en rehabilitación traumatológica deportiva y patologías de columna vertebral.',
    'Resistencia, Chaco'
  ),
  (
    'Dra. Laura Martínez',
    'Nutrición',
    'MP 1845',
    18000,
    'Nutrición clínica y deportiva. Acompañamiento integral.',
    'Resistencia, Chaco'
  ),
  (
    'Lic. Nicolás Valenzuela',
    'Psicología',
    'MP 2990',
    30000,
    'Psicología cognitivo-conductual. Jóvenes y adultos.',
    'Resistencia, Chaco'
  );
