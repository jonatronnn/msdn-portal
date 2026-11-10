-- Staff module rebuilt to the November 2026 spec.
--
-- Only owners (role 'admin', shown as "Owner") and managers log in. New
-- starters fill in their details through a one-off emailed link instead of an
-- account. Payslips, P45s, the policy handbook, in-portal contract signing and
-- notification emails are removed. The Children module is unchanged.

-- ---------------------------------------------------------------------------
-- Remove what the new spec doesn't include
-- ---------------------------------------------------------------------------

drop function public.submit_starter_form(date, text, text, text, text, text, text, text, text, jsonb, text, text, text, text);
drop function public.sign_contract(uuid, text, text, text);

drop table public.payslips, public.p45s, public.policy_acknowledgements, public.policies,
  public.notification_settings, public.notification_log, public.employee_qualifications,
  public.onboarding_tasks, public.onboarding_task_templates, public.contracts;
drop type public.contract_status;

drop policy "Staff read own employee record" on public.employees;
drop function public.current_employee_id();

-- Staff no longer have logins. New auth users still start as inactive
-- 'staff', which can see nothing; an active profile must be owner or manager.
update public.profiles set active = false where role = 'staff';
alter table public.profiles add constraint profiles_active_role_check check (not active or role <> 'staff');

-- ---------------------------------------------------------------------------
-- Employee record
-- ---------------------------------------------------------------------------

alter table public.employees
  alter column email set not null,
  drop column employee_number,
  drop column home_phone,
  drop column profile_id,
  drop column starter_form_completed_at,
  add column qualification_date date,
  add column contract_type text check (contract_type in ('Permanent', 'Fixed-term', 'Bank / relief', 'Apprentice')),
  add column contract_end_date date,
  add column notice_period text,
  add column probation_end_date date,
  add column working_pattern text,
  add column contracted_hours numeric(5, 2) check (contracted_hours > 0),
  add column pay_rate numeric(10, 2) check (pay_rate > 0),
  add column pay_rate_basis text check (pay_rate_basis in ('hourly', 'annual')),
  -- When the new starter returned the Important information form.
  add column info_form_submitted_at timestamptz,
  -- Lets managers see that bank details are on file without seeing them.
  add column bank_details_received_at timestamptz;

-- Bank details are encrypted by the app (AES-256-GCM, key in BANK_DETAILS_KEY)
-- before they reach the database, and only owners can read the row.
create table public.employee_bank_details (
  employee_id uuid primary key references public.employees (id) on delete cascade,
  encrypted text not null,
  updated_at timestamptz not null default now(),
  updated_by_name text
);

create table public.training_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  -- How long the certificate lasts; used to suggest the expiry date.
  validity_months int check (validity_months > 0),
  active boolean not null default true
);

create table public.employee_training (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  training_type_id uuid not null references public.training_types (id),
  completed_on date,
  expires_on date,
  recorded_by_name text,
  created_at timestamptz not null default now()
);

-- Signed contract PDFs, uploaded by managers.
create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  title text not null,
  storage_path text not null,
  uploaded_at timestamptz not null default now(),
  uploaded_by_name text
);

-- ---------------------------------------------------------------------------
-- Onboarding
-- ---------------------------------------------------------------------------

-- Steps with an automation are ticked by the portal when the thing happens:
--   form_sent          Important information form emailed to the starter
--   form_returned      the starter submitted the form
--   employment_details all the manager-entered details are filled in
--   contract_uploaded  a signed contract was uploaded
--   payroll_ref        a payroll reference number was added
create table public.onboarding_task_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  automation text check (automation in ('form_sent', 'form_returned', 'employment_details', 'contract_uploaded', 'payroll_ref')),
  sort_order int not null default 0,
  active boolean not null default true
);

create table public.onboarding_tasks (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  title text not null,
  automation text,
  sort_order int not null default 0,
  completed_at timestamptz,
  completed_by uuid references public.profiles (id),
  -- Kept with the tick so the name shows to every manager.
  completed_by_name text
);

-- One-off links for the Important information form. Only a hash of the token
-- is stored; the link stops working once used, replaced or expired.
create table public.starter_form_links (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  token_hash text not null unique,
  sent_to text not null,
  sent_at timestamptz not null default now(),
  sent_by_name text,
  expires_at timestamptz not null,
  used_at timestamptz,
  revoked_at timestamptz
);

create index on public.employee_training (employee_id);
create index on public.employee_training (expires_on);
create index on public.contracts (employee_id);
create index on public.onboarding_tasks (employee_id);
create index on public.starter_form_links (employee_id);

-- ---------------------------------------------------------------------------
-- Access rules
-- ---------------------------------------------------------------------------

alter table public.employee_bank_details enable row level security;
alter table public.training_types enable row level security;
alter table public.employee_training enable row level security;
alter table public.contracts enable row level security;
alter table public.onboarding_task_templates enable row level security;
alter table public.onboarding_tasks enable row level security;
alter table public.starter_form_links enable row level security;

create policy "Owners manage bank details" on public.employee_bank_details
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "Managers read training types" on public.training_types
  for select to authenticated using (public.is_manager_or_admin());
create policy "Owners manage training types" on public.training_types
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "Managers manage training records" on public.employee_training
  for all to authenticated
  using (public.is_manager_or_admin()) with check (public.is_manager_or_admin());

create policy "Managers manage contracts" on public.contracts
  for all to authenticated
  using (public.is_manager_or_admin()) with check (public.is_manager_or_admin());

create policy "Managers read onboarding templates" on public.onboarding_task_templates
  for select to authenticated using (public.is_manager_or_admin());
create policy "Owners manage onboarding templates" on public.onboarding_task_templates
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "Managers manage onboarding tasks" on public.onboarding_tasks
  for all to authenticated
  using (public.is_manager_or_admin()) with check (public.is_manager_or_admin());

-- Managers see and create links; the public form itself is served with the
-- service role after checking the token.
create policy "Managers manage starter form links" on public.starter_form_links
  for all to authenticated
  using (public.is_manager_or_admin()) with check (public.is_manager_or_admin());

grant select, insert, update, delete on
  public.employee_bank_details, public.training_types, public.employee_training, public.contracts,
  public.onboarding_task_templates, public.onboarding_tasks, public.starter_form_links
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Starting lists; owners edit both under Settings.
-- ---------------------------------------------------------------------------

insert into public.training_types (name, validity_months) values
  ('Paediatric first aid', 36),
  ('Safeguarding', 24),
  ('Designated safeguarding lead', 24),
  ('FGM awareness', 36),
  ('Prevent duty', 36),
  ('Food hygiene', 36),
  ('Fire safety', 12),
  ('Manual handling', 36);

insert into public.onboarding_task_templates (title, automation, sort_order) values
  ('Important information form sent', 'form_sent', 1),
  ('Important information form returned', 'form_returned', 2),
  ('Employment details completed', 'employment_details', 3),
  ('Right to work checked', null, 4),
  ('Enhanced DBS check completed', null, 5),
  ('Two references received', null, 6),
  ('Signed contract uploaded', 'contract_uploaded', 7),
  ('Added to payroll (payroll reference recorded)', 'payroll_ref', 8),
  ('Added to Famly', null, 9),
  ('Safeguarding and paediatric first aid training recorded', null, 10),
  ('Induction completed', null, 11);
