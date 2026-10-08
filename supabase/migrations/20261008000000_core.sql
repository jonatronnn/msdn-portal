-- Core: users, roles and the helper functions every module's access rules build on.
--
-- Roles:
--   admin   – owners/admins. Everything, including user management and settings.
--   manager – nursery managers. Staff records, onboarding, contracts.
--   staff   – employees. Only their own record, contracts, payslips and the handbook.
--
-- Admins and managers must have signed in with two-factor authentication (aal2)
-- before the database grants them their elevated access.

create type public.app_role as enum ('admin', 'manager', 'staff');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role public.app_role not null default 'staff',
  -- New auth users start inactive; only the invite flow activates them, so an
  -- account created any other way can see nothing.
  active boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, coalesce(new.email, ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Role of the signed-in user, or null when signed out or deactivated.
create function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = auth.uid() and active
$$;

create function public.has_mfa()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
$$;

create function public.is_admin()
returns boolean
language sql
stable
as $$
  select public.current_app_role() = 'admin' and public.has_mfa()
$$;

create function public.is_manager_or_admin()
returns boolean
language sql
stable
as $$
  select public.current_app_role() in ('admin', 'manager') and public.has_mfa()
$$;

create policy "Users read their own profile; admins read all"
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());

-- Profile changes go through the admin-only server actions (service role),
-- so there are no insert/update/delete policies for signed-in users.

revoke all on function public.handle_new_user() from public, anon, authenticated;
