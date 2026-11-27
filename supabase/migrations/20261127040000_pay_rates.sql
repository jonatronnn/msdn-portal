-- Hourly pay comes from a table of rates by age and qualification, with flat
-- rates for Room Leaders and Senior Practitioners and extras for DSL and SENCo.
-- Managers read the rates (the staff record shows each person's rate);
-- only owners change them, on Admin > Pay rates.
create table public.pay_rates (
  key text primary key,
  rate numeric(10, 2) not null check (rate >= 0),
  updated_at timestamptz not null default now(),
  updated_by_name text
);

insert into public.pay_rates (key, rate) values
  ('under_18', 8.00),
  ('age_18_unqualified', 10.85),
  ('age_18_level_2', 10.92),
  ('age_21_unqualified', 12.71),
  ('age_21_level_2', 12.85),
  ('age_21_level_3', 12.97),
  ('room_leader', 13.12),
  ('senior', 13.34),
  ('dsl_extra', 0),
  ('senco_extra', 0);

alter table public.pay_rates enable row level security;

create policy "Managers read pay rates" on public.pay_rates
  for select to authenticated using (public.is_manager_or_admin());

create policy "Owners change pay rates" on public.pay_rates
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

grant select, update on public.pay_rates to authenticated;
grant select, insert, update, delete on public.pay_rates to service_role;

alter table public.employees
  add column is_dsl boolean not null default false,
  add column is_senco boolean not null default false;

-- Level 1 and levels 4 to 7 are no longer used.
update public.employees set qualification_level = null
  where qualification_level is not null and qualification_level not in ('Unqualified', 'Level 2', 'Level 3');

alter table public.employees add column apprenticeship_start_date date;
