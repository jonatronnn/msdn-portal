-- NI number, emergency contact and P45 for each employee.

alter table public.employees
  add column ni_number text unique check (ni_number ~ '^[A-Z]{2}[0-9]{6}[A-D]$'),
  add column emergency_contact_name text,
  add column emergency_contact_relationship text,
  add column emergency_contact_phone text;

-- A P45 shows pay and tax, so like payslips it is visible only to admins and
-- the employee. New starters can upload their own through the starter form.
create table public.p45s (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null unique references public.employees (id) on delete cascade,
  storage_path text not null,
  uploaded_by uuid references public.profiles (id),
  uploaded_at timestamptz not null default now()
);

alter table public.p45s enable row level security;

create policy "Admins manage P45s" on public.p45s
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "Staff read own P45" on public.p45s
  for select to authenticated
  using (employee_id = public.current_employee_id());
create policy "Staff upload own P45" on public.p45s
  for insert to authenticated
  with check (employee_id = public.current_employee_id() and uploaded_by = auth.uid());

insert into storage.buckets (id, name, public) values ('p45s', 'p45s', false);

-- The starter form now also collects the NI number and emergency contact.
drop function public.submit_starter_form(date, text, text, text, text, text, text, text, text, jsonb);

create function public.submit_starter_form(
  p_date_of_birth date,
  p_address_line1 text,
  p_address_line2 text,
  p_town text,
  p_postcode text,
  p_mobile_phone text,
  p_home_phone text,
  p_email text,
  p_qualification_level text,
  p_other_qualifications jsonb,
  p_ni_number text,
  p_emergency_contact_name text,
  p_emergency_contact_relationship text,
  p_emergency_contact_phone text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_employee_id uuid := public.current_employee_id();
  q jsonb;
begin
  if v_employee_id is null then
    raise exception 'No employee record is linked to this account';
  end if;

  update public.employees set
    date_of_birth = p_date_of_birth,
    address_line1 = p_address_line1,
    address_line2 = p_address_line2,
    town = p_town,
    postcode = p_postcode,
    mobile_phone = p_mobile_phone,
    home_phone = p_home_phone,
    email = p_email,
    qualification_level = p_qualification_level,
    ni_number = p_ni_number,
    emergency_contact_name = p_emergency_contact_name,
    emergency_contact_relationship = p_emergency_contact_relationship,
    emergency_contact_phone = p_emergency_contact_phone,
    starter_form_completed_at = now()
  where id = v_employee_id;

  delete from public.employee_qualifications where employee_id = v_employee_id;
  for q in select * from jsonb_array_elements(coalesce(p_other_qualifications, '[]'::jsonb)) loop
    if coalesce(trim(q ->> 'name'), '') <> '' then
      insert into public.employee_qualifications (employee_id, name, achieved_on)
      values (v_employee_id, trim(q ->> 'name'), nullif(q ->> 'achieved_on', '')::date);
    end if;
  end loop;
end;
$$;

revoke all on function public.submit_starter_form(date, text, text, text, text, text, text, text, text, jsonb, text, text, text, text) from public, anon;
grant execute on function public.submit_starter_form(date, text, text, text, text, text, text, text, text, jsonb, text, text, text, text) to authenticated;
