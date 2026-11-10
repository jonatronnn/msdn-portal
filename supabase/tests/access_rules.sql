-- Access-rule tests. Run with scripts/test-db.sh.
-- Each block signs in as a user (by setting the JWT claims Supabase would set)
-- and checks what that user can see and change.

create function pg_temp.expect(actual anyelement, expected anyelement, label text) returns void
language plpgsql as $$
begin
  if actual is distinct from expected then
    raise exception 'FAIL: % (expected %, got %)', label, expected, actual;
  end if;
end;
$$;

create function pg_temp.sign_in(user_id uuid, aal text) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', user_id, 'role', 'authenticated', 'aal', aal)::text, false);
  set role authenticated;
end;
$$;

create function pg_temp.sign_out() returns void
language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claims', '', false);
end;
$$;

-- Fixtures ------------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'owner@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'manager@example.com'),
  ('00000000-0000-0000-0000-00000000000e', 'self-signup@example.com');

update profiles set active = true, role = 'admin' where email = 'owner@example.com';
update profiles set active = true, role = 'manager' where email = 'manager@example.com';
-- self-signup@example.com keeps the trigger defaults: staff, inactive.

insert into employees (id, first_name, last_name, email, payroll_id) values
  ('10000000-0000-0000-0000-000000000001', 'Sam', 'One', 'sam@example.com', 'P1'),
  ('10000000-0000-0000-0000-000000000002', 'Alex', 'Two', 'alex@example.com', 'P2');

insert into employee_bank_details (employee_id, encrypted) values
  ('10000000-0000-0000-0000-000000000001', 'ciphertext');
insert into contracts (employee_id, title, storage_path) values
  ('10000000-0000-0000-0000-000000000001', 'Contract', 'c/1.pdf');
insert into employee_training (employee_id, training_type_id, expires_on)
  select '10000000-0000-0000-0000-000000000001', id, '2027-01-01' from training_types where name = 'Paediatric first aid';
insert into onboarding_tasks (employee_id, title) values
  ('10000000-0000-0000-0000-000000000001', 'Right to work checked');
insert into starter_form_links (employee_id, token_hash, sent_to, expires_at) values
  ('10000000-0000-0000-0000-000000000001', 'hash', 'sam@example.com', now() + interval '14 days');

insert into children (id, first_name, last_name) values
  ('40000000-0000-0000-0000-000000000001', 'Rosie', 'Child');
insert into child_checklist_tasks (child_id, title) values
  ('40000000-0000-0000-0000-000000000001', 'Tour of the setting booked');

-- Profiles -------------------------------------------------------------------
select pg_temp.expect((select role::text || '/' || active::text from profiles where email = 'self-signup@example.com'),
  'staff/false', 'new auth users start as inactive staff');
do $$ begin
  update profiles set active = true where email = 'self-signup@example.com';
  raise exception 'FAIL: a staff profile was activated';
exception when check_violation then null;
end $$;

-- Owner ----------------------------------------------------------------------
select pg_temp.sign_in('00000000-0000-0000-0000-00000000000a', 'aal2');
select pg_temp.expect((select count(*) from profiles), 3::bigint, 'owner sees all profiles');
select pg_temp.expect((select count(*) from employees), 2::bigint, 'owner sees all employees');
select pg_temp.expect((select count(*) from employee_bank_details), 1::bigint, 'owner sees bank details');
insert into training_types (name, validity_months) values ('Owner course', 12);
insert into onboarding_task_templates (title) values ('Owner step');
insert into child_checklist_templates (title) values ('Owner child step');
select pg_temp.sign_out();

-- Owner without two-factor sign-in gets nothing ------------------------------
select pg_temp.sign_in('00000000-0000-0000-0000-00000000000a', 'aal1');
select pg_temp.expect((select count(*) from profiles), 1::bigint, 'aal1 owner sees only own profile');
select pg_temp.expect((select count(*) from employees), 0::bigint, 'aal1 owner sees no employees');
select pg_temp.expect((select count(*) from employee_bank_details), 0::bigint, 'aal1 owner sees no bank details');
select pg_temp.expect((select count(*) from children), 0::bigint, 'aal1 owner sees no children');
select pg_temp.sign_out();

-- Manager --------------------------------------------------------------------
select pg_temp.sign_in('00000000-0000-0000-0000-00000000000b', 'aal2');
select pg_temp.expect((select count(*) from employees), 2::bigint, 'manager sees all employees');
select pg_temp.expect((select count(*) from employee_bank_details), 0::bigint, 'manager cannot see bank details');
do $$ begin
  insert into employee_bank_details (employee_id, encrypted) values ('10000000-0000-0000-0000-000000000002', 'x');
  raise exception 'FAIL: manager wrote bank details';
exception when insufficient_privilege then null;
end $$;
select pg_temp.expect((select count(*) from contracts), 1::bigint, 'manager sees contracts');
select pg_temp.expect((select count(*) from employee_training), 1::bigint, 'manager sees training records');
select pg_temp.expect((select count(*) from onboarding_tasks), 1::bigint, 'manager sees onboarding tasks');
select pg_temp.expect((select count(*) from starter_form_links), 1::bigint, 'manager sees starter form links');
select pg_temp.expect((select count(*) from training_types), 9::bigint, 'manager reads training types');
select pg_temp.expect((select count(*) from onboarding_task_templates), 12::bigint, 'manager reads onboarding template');
do $$ begin
  insert into training_types (name) values ('Manager course');
  raise exception 'FAIL: manager added a training type';
exception when insufficient_privilege then null;
end $$;
do $$ begin
  insert into onboarding_task_templates (title) values ('Manager step');
  raise exception 'FAIL: manager edited the onboarding template';
exception when insufficient_privilege then null;
end $$;
insert into employees (first_name, last_name, email) values ('New', 'Starter', 'new@example.com');
update employees set job_title = 'Room leader', contract_type = 'Permanent' where payroll_id = 'P1';
insert into employee_training (employee_id, training_type_id, completed_on)
  select '10000000-0000-0000-0000-000000000002', id, '2026-01-01' from training_types where name = 'FGM awareness';
update onboarding_tasks set completed_at = now(), completed_by_name = 'Mia Manager';
select pg_temp.expect((select count(*) from profiles), 1::bigint, 'manager sees only own profile');
select pg_temp.expect((select count(*) from children), 1::bigint, 'manager sees children');
update child_checklist_tasks set completed_at = now(), notes = 'Booked for Tuesday';
select pg_temp.expect((select notes from child_checklist_tasks), 'Booked for Tuesday', 'manager ticks child checklist steps');
do $$ begin
  insert into child_checklist_templates (title) values ('x');
  raise exception 'FAIL: manager edited the child checklist template';
exception when insufficient_privilege then null;
end $$;
select pg_temp.sign_out();

select pg_temp.expect((select job_title from employees where payroll_id = 'P1'), 'Room leader', 'manager edit kept');

-- Constraints -----------------------------------------------------------------
do $$ begin
  insert into employees (first_name, last_name, email, ni_number) values ('Bad', 'NI', 'bad@example.com', 'AB123');
  raise exception 'FAIL: invalid NI number stored';
exception when check_violation then null;
end $$;
do $$ begin
  insert into employees (first_name, last_name, email, contract_type) values ('Bad', 'Contract', 'bad@example.com', 'Casual');
  raise exception 'FAIL: unknown contract type stored';
exception when check_violation then null;
end $$;
do $$ begin
  insert into employees (first_name, last_name) values ('No', 'Email');
  raise exception 'FAIL: employee without email stored';
exception when not_null_violation then null;
end $$;

-- Inactive / self-signed-up user sees nothing ---------------------------------
select pg_temp.sign_in('00000000-0000-0000-0000-00000000000e', 'aal2');
select pg_temp.expect((select count(*) from employees), 0::bigint, 'inactive user sees no employees');
select pg_temp.expect((select count(*) from starter_form_links), 0::bigint, 'inactive user sees no starter links');
select pg_temp.expect((select count(*) from children), 0::bigint, 'inactive user sees no children');
select pg_temp.sign_out();

-- Deactivated manager loses access ----------------------------------------------
update profiles set active = false where email = 'manager@example.com';
select pg_temp.sign_in('00000000-0000-0000-0000-00000000000b', 'aal2');
select pg_temp.expect((select count(*) from employees), 0::bigint, 'deactivated manager sees no employees');
select pg_temp.sign_out();

-- Signed-out (anon) sees nothing ---------------------------------------------
set role anon;
do $$ begin
  perform count(*) from employees;
  raise exception 'FAIL: anon read employees';
exception when insufficient_privilege then null;
end $$;
do $$ begin
  perform count(*) from starter_form_links;
  raise exception 'FAIL: anon read starter form links';
exception when insufficient_privilege then null;
end $$;
do $$ begin
  perform count(*) from children;
  raise exception 'FAIL: anon read children';
exception when insufficient_privilege then null;
end $$;
reset role;
