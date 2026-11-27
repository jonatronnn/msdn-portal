-- Staff details synced with Famly (middle name, gender) and the extra
-- details on the new starter form. Only middle name and gender reach Famly;
-- Famly's API has nowhere for the rest.

alter table public.employees
  add column middle_name text,
  add column nickname text,
  -- Blank means not specified.
  add column gender text check (gender in ('Male', 'Female', 'Non-binary')),
  add column nationality text,
  -- Country or region of birth.
  add column place_of_birth text,
  add column home_phone text,
  add column emergency_contact_address text,
  -- "Additional information" on the starter form.
  add column special_notes text;

-- Passport and driving licence numbers are encrypted by the app (same key
-- as bank details); owners and managers can read them.
create table public.employee_id_numbers (
  employee_id uuid primary key references public.employees (id) on delete cascade,
  encrypted text not null,
  updated_at timestamptz not null default now(),
  updated_by_name text
);

-- Medical details are special category data: owners and managers only, and
-- never sent to Famly.
create table public.employee_medical (
  employee_id uuid primary key references public.employees (id) on delete cascade,
  doctor_name text,
  doctor_address text,
  doctor_phone text,
  blood_type text check (blood_type in ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Don''t know')),
  medical_conditions text,
  allergies text,
  updated_at timestamptz not null default now(),
  updated_by_name text
);

alter table public.employee_id_numbers enable row level security;
alter table public.employee_medical enable row level security;

create policy "Managers manage ID numbers" on public.employee_id_numbers
  for all to authenticated
  using (public.is_manager_or_admin()) with check (public.is_manager_or_admin());

create policy "Managers manage medical details" on public.employee_medical
  for all to authenticated
  using (public.is_manager_or_admin()) with check (public.is_manager_or_admin());

grant select, insert, update, delete on public.employee_id_numbers, public.employee_medical
  to authenticated, service_role;
