-- Staff module: employee records, qualifications, contracts, handbook policies,
-- payslips, onboarding checklists and notification settings.

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  employee_number text unique,
  payroll_id text unique,
  first_name text not null,
  last_name text not null,
  date_of_birth date,
  address_line1 text,
  address_line2 text,
  town text,
  postcode text,
  mobile_phone text,
  home_phone text,
  email text,
  job_title text,
  start_date date,
  qualification_level text check (qualification_level in
    ('Unqualified', 'Level 2', 'Level 3', 'Level 4', 'Level 5', 'Level 6', 'Level 7')),
  leave_date date,
  leave_reason text,
  profile_id uuid unique references public.profiles (id) on delete set null,
  starter_form_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.employee_qualifications (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  name text not null,
  achieved_on date
);

create type public.contract_status as enum ('sent', 'signed', 'void');

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  title text not null,
  storage_path text not null,
  -- SHA-256 of the file, so a signature is tied to the exact document shown.
  sha256 text not null,
  status public.contract_status not null,
  sent_at timestamptz,
  sent_by uuid references public.profiles (id),
  signed_at timestamptz,
  signed_name text,
  signed_ip text,
  signed_user_agent text,
  -- true when a paper-signed copy was uploaded rather than signed in the portal
  uploaded_signed boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.policies (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  storage_path text not null,
  requires_acknowledgement boolean not null default true,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.policy_acknowledgements (
  policy_id uuid not null references public.policies (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  acknowledged_at timestamptz not null default now(),
  recorded_by uuid references public.profiles (id),
  primary key (policy_id, employee_id)
);

create table public.payslips (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  pay_date date not null,
  file_name text not null,
  storage_path text not null,
  uploaded_by uuid references public.profiles (id),
  uploaded_at timestamptz not null default now()
);

create table public.onboarding_task_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  sort_order int not null default 0,
  active boolean not null default true
);

create table public.onboarding_tasks (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  title text not null,
  sort_order int not null default 0,
  completed_at timestamptz,
  completed_by uuid references public.profiles (id)
);

create table public.notification_settings (
  id int primary key default 1 check (id = 1),
  birthdays_enabled boolean not null default true,
  anniversaries_enabled boolean not null default true,
  weekly_digest_enabled boolean not null default true,
  -- 0 = Sunday … 6 = Saturday
  weekly_digest_day int not null default 1 check (weekly_digest_day between 0 and 6),
  recipients text[] not null default '{}'
);

insert into public.notification_settings (id) values (1);

-- Stops the daily job sending the same email twice if it runs more than once.
create table public.notification_log (
  key text primary key,
  sent_at timestamptz not null default now()
);

create index on public.employee_qualifications (employee_id);
create index on public.contracts (employee_id);
create index on public.policy_acknowledgements (employee_id);
create index on public.payslips (employee_id, pay_date desc);
create index on public.onboarding_tasks (employee_id);

create function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger employees_touch_updated_at
  before update on public.employees
  for each row execute function public.touch_updated_at();

-- The employee record belonging to the signed-in user.
create function public.current_employee_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select e.id
  from public.employees e
  join public.profiles p on p.id = e.profile_id
  where p.id = auth.uid() and p.active
$$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.employees enable row level security;
alter table public.employee_qualifications enable row level security;
alter table public.contracts enable row level security;
alter table public.policies enable row level security;
alter table public.policy_acknowledgements enable row level security;
alter table public.payslips enable row level security;
alter table public.onboarding_task_templates enable row level security;
alter table public.onboarding_tasks enable row level security;
alter table public.notification_settings enable row level security;
alter table public.notification_log enable row level security;

-- Employees: managers/admins manage; staff read their own record.
-- Staff update their own record only through submit_starter_form().
create policy "Managers manage employees" on public.employees
  for all to authenticated
  using (public.is_manager_or_admin()) with check (public.is_manager_or_admin());
create policy "Staff read own employee record" on public.employees
  for select to authenticated
  using (id = public.current_employee_id());

create policy "Managers manage qualifications" on public.employee_qualifications
  for all to authenticated
  using (public.is_manager_or_admin()) with check (public.is_manager_or_admin());
create policy "Staff read own qualifications" on public.employee_qualifications
  for select to authenticated
  using (employee_id = public.current_employee_id());

-- Contracts: staff read their own (non-void) ones and sign through sign_contract().
create policy "Managers manage contracts" on public.contracts
  for all to authenticated
  using (public.is_manager_or_admin()) with check (public.is_manager_or_admin());
create policy "Staff read own contracts" on public.contracts
  for select to authenticated
  using (employee_id = public.current_employee_id() and status <> 'void');

-- Handbook: everyone signed in reads live policies; admins manage them.
create policy "Signed-in users read live policies" on public.policies
  for select to authenticated
  using ((not archived and public.current_app_role() is not null) or public.is_manager_or_admin());
create policy "Admins manage policies" on public.policies
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "Managers manage acknowledgements" on public.policy_acknowledgements
  for all to authenticated
  using (public.is_manager_or_admin()) with check (public.is_manager_or_admin());
create policy "Staff read own acknowledgements" on public.policy_acknowledgements
  for select to authenticated
  using (employee_id = public.current_employee_id());
create policy "Staff acknowledge policies themselves" on public.policy_acknowledgements
  for insert to authenticated
  with check (employee_id = public.current_employee_id() and recorded_by = auth.uid());

-- Payslips: admins only, plus each employee's own.
create policy "Admins manage payslips" on public.payslips
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "Staff read own payslips" on public.payslips
  for select to authenticated
  using (employee_id = public.current_employee_id());

create policy "Managers read onboarding templates" on public.onboarding_task_templates
  for select to authenticated using (public.is_manager_or_admin());
create policy "Admins manage onboarding templates" on public.onboarding_task_templates
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "Managers manage onboarding tasks" on public.onboarding_tasks
  for all to authenticated
  using (public.is_manager_or_admin()) with check (public.is_manager_or_admin());

create policy "Admins manage notification settings" on public.notification_settings
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- notification_log has no policies: only the service role (daily job) touches it.

-- ---------------------------------------------------------------------------
-- Actions staff can take on their own records
-- ---------------------------------------------------------------------------

-- New starter form: fills in the employee's own details and qualifications.
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
  p_other_qualifications jsonb
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

-- Electronic signature of a contract sent to the signed-in employee.
create function public.sign_contract(
  p_contract_id uuid,
  p_signed_name text,
  p_ip text,
  p_user_agent text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(trim(p_signed_name), '') = '' then
    raise exception 'Type your full name to sign';
  end if;

  update public.contracts set
    status = 'signed',
    signed_at = now(),
    signed_name = trim(p_signed_name),
    signed_ip = p_ip,
    signed_user_agent = p_user_agent
  where id = p_contract_id
    and employee_id = public.current_employee_id()
    and status = 'sent';

  if not found then
    raise exception 'This contract is not waiting for your signature';
  end if;
end;
$$;

revoke all on function public.submit_starter_form(date, text, text, text, text, text, text, text, text, jsonb) from public, anon;
revoke all on function public.sign_contract(uuid, text, text, text) from public, anon;
grant execute on function public.submit_starter_form(date, text, text, text, text, text, text, text, text, jsonb) to authenticated;
grant execute on function public.sign_contract(uuid, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- File storage. Buckets are private and have no storage policies, so files are
-- only reachable through short-lived signed links the app creates after the
-- database rules above have confirmed the user may see the record.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values
  ('contracts', 'contracts', false),
  ('policies', 'policies', false),
  ('payslips', 'payslips', false);

-- A starting onboarding checklist; admins edit it from Onboarding → Checklist.
insert into public.onboarding_task_templates (title, sort_order) values
  ('Right to work checked', 1),
  ('Enhanced DBS check completed', 2),
  ('Two references received', 3),
  ('Contract signed', 4),
  ('Added to payroll', 5),
  ('Added to Famly', 6),
  ('Safeguarding training completed', 7),
  ('Paediatric first aid booked', 8),
  ('Induction completed', 9);
