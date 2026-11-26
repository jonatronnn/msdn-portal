-- Wages module: each employee's shift pattern, and a page per month where
-- managers record extra minutes, sickness, holiday and overtime. The owner
-- finalises the month for payroll and archives it once payroll has run.

-- ---------------------------------------------------------------------------
-- Shift patterns
-- ---------------------------------------------------------------------------

-- A pattern applies from effective_from until the employee's next pattern, so
-- a change part-way through a month is picked up from that day.
create table public.shift_patterns (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  effective_from date not null,
  -- Set when the pattern alternates between week A and week B: any date in a
  -- week A. Weeks then alternate from that week's Monday.
  week_a_from date,
  created_at timestamptz not null default now(),
  created_by_name text,
  unique (employee_id, effective_from)
);

create table public.shift_pattern_days (
  pattern_id uuid not null references public.shift_patterns (id) on delete cascade,
  week text not null check (week in ('A', 'B')),
  -- 1 = Monday … 7 = Sunday
  weekday int not null check (weekday between 1 and 7),
  starts_at time not null,
  ends_at time not null,
  -- Unpaid break; null when no break is taken.
  break_minutes int check (break_minutes > 0),
  primary key (pattern_id, week, weekday),
  check (ends_at > starts_at),
  check (break_minutes is null or break_minutes * 60 < extract(epoch from ends_at - starts_at))
);

-- ---------------------------------------------------------------------------
-- Monthly wages
-- ---------------------------------------------------------------------------

create table public.wage_months (
  -- The first day of the month.
  month date primary key check (extract(day from month) = 1),
  status text not null default 'open' check (status in ('open', 'finalised', 'archived')),
  started_by_name text,
  created_at timestamptz not null default now(),
  finalised_at timestamptz,
  finalised_by_name text,
  archived_at timestamptz,
  archived_by_name text
);

-- Days the nursery is closed (other than bank holidays), such as between
-- Christmas and New Year.
create table public.wage_closure_days (
  month date not null references public.wage_months (month) on delete cascade,
  date date not null,
  primary key (month, date),
  check (date_trunc('month', date)::date = month)
);

-- One row per employee per month.
create table public.wage_rows (
  id uuid primary key default gen_random_uuid(),
  month date not null references public.wage_months (month) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  -- Contracted minutes for each working day, e.g. {"2026-12-01": 540}, worked
  -- out from the shift patterns. Refreshed while the month is open.
  contracted jsonb not null default '{}',
  extra_minutes int not null default 0,
  overtime_minutes int not null default 0 check (overtime_minutes >= 0),
  -- Closure days: true = taken as holiday, false = unpaid, null = not chosen.
  closure_as_holiday boolean,
  updated_at timestamptz,
  updated_by_name text,
  unique (month, employee_id)
);

-- Sickness and holiday. Part-day sickness is in minutes; a full sick day or a
-- holiday day takes that day's contracted hours.
create table public.wage_entries (
  id uuid primary key default gen_random_uuid(),
  row_id uuid not null references public.wage_rows (id) on delete cascade,
  kind text not null check (kind in ('sick_hours', 'sick_day', 'holiday')),
  date date,
  minutes int check (minutes > 0),
  created_at timestamptz not null default now(),
  created_by_name text,
  check ((kind = 'sick_hours') = (minutes is not null)),
  check (kind = 'sick_hours' or date is not null)
);

create index on public.shift_patterns (employee_id);
create index on public.wage_rows (employee_id);
create index on public.wage_entries (row_id);
-- A day is either a sick day or a holiday, once.
create unique index on public.wage_entries (row_id, date) where kind <> 'sick_hours';

-- An archived month is read-only for good, and only an open month can be deleted.
create function public.wage_month_guard()
returns trigger
language plpgsql
as $$
begin
  if old.status = 'archived' then
    raise exception 'An archived month can''t be changed';
  end if;
  if tg_op = 'DELETE' then
    if old.status <> 'open' then
      raise exception 'Only an open month can be deleted';
    end if;
    return old;
  end if;
  return new;
end;
$$;

create trigger wage_months_guard
  before update or delete on public.wage_months
  for each row execute function public.wage_month_guard();

create function public.wage_month_open(p_month date)
returns boolean
language sql
stable
as $$
  select exists (select 1 from public.wage_months where month = p_month and status = 'open')
$$;

-- ---------------------------------------------------------------------------
-- Access rules: managers and the owner record; only the owner finalises,
-- reopens, archives or deletes a month; nothing changes once it's finalised.
-- ---------------------------------------------------------------------------

alter table public.shift_patterns enable row level security;
alter table public.shift_pattern_days enable row level security;
alter table public.wage_months enable row level security;
alter table public.wage_closure_days enable row level security;
alter table public.wage_rows enable row level security;
alter table public.wage_entries enable row level security;

create policy "Managers manage shift patterns" on public.shift_patterns
  for all to authenticated
  using (public.is_manager_or_admin()) with check (public.is_manager_or_admin());
create policy "Managers manage shift pattern days" on public.shift_pattern_days
  for all to authenticated
  using (public.is_manager_or_admin()) with check (public.is_manager_or_admin());

create policy "Managers read wage months" on public.wage_months
  for select to authenticated using (public.is_manager_or_admin());
create policy "Managers start wage months" on public.wage_months
  for insert to authenticated with check (public.is_manager_or_admin() and status = 'open');
create policy "Owners change wage months" on public.wage_months
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Owners delete wage months" on public.wage_months
  for delete to authenticated using (public.is_admin());

create policy "Managers read closure days" on public.wage_closure_days
  for select to authenticated using (public.is_manager_or_admin());
create policy "Managers set closure days in open months" on public.wage_closure_days
  for all to authenticated
  using (public.is_manager_or_admin() and public.wage_month_open(month))
  with check (public.is_manager_or_admin() and public.wage_month_open(month));

create policy "Managers read wage rows" on public.wage_rows
  for select to authenticated using (public.is_manager_or_admin());
create policy "Managers edit wage rows in open months" on public.wage_rows
  for all to authenticated
  using (public.is_manager_or_admin() and public.wage_month_open(month))
  with check (public.is_manager_or_admin() and public.wage_month_open(month));

create policy "Managers read wage entries" on public.wage_entries
  for select to authenticated using (public.is_manager_or_admin());
create policy "Managers edit wage entries in open months" on public.wage_entries
  for all to authenticated
  using (
    public.is_manager_or_admin()
    and exists (select 1 from public.wage_rows r where r.id = row_id and public.wage_month_open(r.month))
  )
  with check (
    public.is_manager_or_admin()
    and exists (select 1 from public.wage_rows r where r.id = row_id and public.wage_month_open(r.month))
  );

grant select, insert, update, delete on
  public.shift_patterns, public.shift_pattern_days, public.wage_months, public.wage_closure_days,
  public.wage_rows, public.wage_entries
  to authenticated, service_role;
