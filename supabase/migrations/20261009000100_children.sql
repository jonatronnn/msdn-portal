-- Children module: a starter checklist for each new child. Famly holds the
-- child's full registration details; the portal tracks the enrolment steps.

create table public.children (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  provisional_start_date date,
  created_at timestamptz not null default now()
);

create table public.child_checklist_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  sort_order int not null default 0,
  active boolean not null default true
);

create table public.child_checklist_tasks (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  title text not null,
  sort_order int not null default 0,
  notes text,
  completed_at timestamptz,
  completed_by uuid references public.profiles (id),
  -- Kept with the tick so "actioned by" shows even though managers can't read
  -- other people's profiles.
  completed_by_name text
);

create index on public.child_checklist_tasks (child_id);

alter table public.children enable row level security;
alter table public.child_checklist_templates enable row level security;
alter table public.child_checklist_tasks enable row level security;

create policy "Managers manage children" on public.children
  for all to authenticated
  using (public.is_manager_or_admin()) with check (public.is_manager_or_admin());

create policy "Managers read child checklist templates" on public.child_checklist_templates
  for select to authenticated using (public.is_manager_or_admin());
create policy "Admins manage child checklist templates" on public.child_checklist_templates
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "Managers manage child checklist tasks" on public.child_checklist_tasks
  for all to authenticated
  using (public.is_manager_or_admin()) with check (public.is_manager_or_admin());

-- The steps from the Early Years enrolment checklist; admins edit them from
-- Children → Standard checklist.
insert into public.child_checklist_templates (title, sort_order) values
  ('Tour of the setting booked', 1),
  ('Registration form received', 2),
  ('Deposit received', 3),
  ('Start date and sessions agreed with parents or carers', 4),
  ('Fees and payment explained (Famly payments, funded hours, tax-free childcare)', 5),
  ('Birth certificate checked', 6),
  ('Contract sent and signed by parents or carers', 7),
  ('Booking pattern added to Famly or registers', 8),
  ('Settling-in sessions planned', 9),
  ('Key person assigned and room team informed', 10),
  ('''All about me'' form sent', 11),
  ('Allergies, dietary needs, disabilities and medical conditions noted and adjustments made', 12),
  ('Parents or carers invited to Famly', 13),
  ('Contact details and emergency contacts confirmed as up to date', 14),
  ('Settling-in sessions and/or home visit confirmed with parents or carers', 15),
  ('Personal items made (name label, coat peg label)', 16),
  ('Team reminded of the child''s first day', 17);
