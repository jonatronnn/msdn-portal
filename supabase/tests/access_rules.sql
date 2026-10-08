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
  ('00000000-0000-0000-0000-00000000000a', 'admin@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'manager@example.com'),
  ('00000000-0000-0000-0000-00000000000c', 'staff1@example.com'),
  ('00000000-0000-0000-0000-00000000000d', 'staff2@example.com'),
  ('00000000-0000-0000-0000-00000000000e', 'self-signup@example.com');

update profiles set active = true, role = 'admin' where email = 'admin@example.com';
update profiles set active = true, role = 'manager' where email = 'manager@example.com';
update profiles set active = true where email in ('staff1@example.com', 'staff2@example.com');
-- self-signup@example.com keeps the trigger defaults: staff, inactive.

insert into employees (id, first_name, last_name, profile_id, payroll_id) values
  ('10000000-0000-0000-0000-000000000001', 'Sam', 'One', '00000000-0000-0000-0000-00000000000c', 'P1'),
  ('10000000-0000-0000-0000-000000000002', 'Alex', 'Two', '00000000-0000-0000-0000-00000000000d', 'P2');

insert into contracts (id, employee_id, title, storage_path, sha256, status) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Contract', 'c/1.pdf', 'abc', 'sent'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'Contract', 'c/2.pdf', 'def', 'sent');

insert into payslips (employee_id, pay_date, file_name, storage_path) values
  ('10000000-0000-0000-0000-000000000001', '2026-09-30', 'P1.pdf', 'p/1.pdf'),
  ('10000000-0000-0000-0000-000000000002', '2026-09-30', 'P2.pdf', 'p/2.pdf');

insert into policies (id, title, storage_path) values
  ('30000000-0000-0000-0000-000000000001', 'Safeguarding', 'pol/1.pdf');
insert into policies (title, storage_path, archived) values ('Old policy', 'pol/0.pdf', true);

insert into onboarding_tasks (employee_id, title) values
  ('10000000-0000-0000-0000-000000000001', 'DBS check');

-- New auth users get an inactive staff profile --------------------------------
select pg_temp.expect((select role::text || '/' || active::text from profiles where email = 'self-signup@example.com'),
  'staff/false', 'new auth users start as inactive staff');

-- Admin ----------------------------------------------------------------------
select pg_temp.sign_in('00000000-0000-0000-0000-00000000000a', 'aal2');
select pg_temp.expect((select count(*) from profiles), 5::bigint, 'admin sees all profiles');
select pg_temp.expect((select count(*) from employees), 2::bigint, 'admin sees all employees');
select pg_temp.expect((select count(*) from payslips), 2::bigint, 'admin sees all payslips');
select pg_temp.expect((select count(*) from policies), 2::bigint, 'admin sees archived policies too');
update notification_settings set weekly_digest_day = 3;
select pg_temp.expect((select weekly_digest_day from notification_settings), 3, 'admin edits notification settings');
select pg_temp.sign_out();

-- Admin without two-factor sign-in gets nothing extra -------------------------
select pg_temp.sign_in('00000000-0000-0000-0000-00000000000a', 'aal1');
select pg_temp.expect((select count(*) from profiles), 1::bigint, 'aal1 admin sees only own profile');
select pg_temp.expect((select count(*) from employees), 0::bigint, 'aal1 admin sees no employees');
select pg_temp.expect((select count(*) from payslips), 0::bigint, 'aal1 admin sees no payslips');
select pg_temp.sign_out();

-- Manager --------------------------------------------------------------------
select pg_temp.sign_in('00000000-0000-0000-0000-00000000000b', 'aal2');
select pg_temp.expect((select count(*) from employees), 2::bigint, 'manager sees all employees');
select pg_temp.expect((select count(*) from contracts), 2::bigint, 'manager sees all contracts');
select pg_temp.expect((select count(*) from onboarding_tasks), 1::bigint, 'manager sees onboarding tasks');
select pg_temp.expect((select count(*) from payslips), 0::bigint, 'manager cannot see payslips');
select pg_temp.expect((select count(*) from profiles), 1::bigint, 'manager sees only own profile');
insert into employees (first_name, last_name) values ('New', 'Starter');
update employees set job_title = 'Room leader' where payroll_id = 'P1';
select pg_temp.expect((select count(*) from notification_settings), 0::bigint, 'manager cannot read settings');
do $$ begin
  insert into policies (title, storage_path) values ('x', 'x');
  raise exception 'FAIL: manager added a policy';
exception when insufficient_privilege then null;
end $$;
select pg_temp.sign_out();

-- Staff ----------------------------------------------------------------------
select pg_temp.sign_in('00000000-0000-0000-0000-00000000000c', 'aal1');
select pg_temp.expect((select count(*) from employees), 1::bigint, 'staff sees only own employee record');
select pg_temp.expect((select payroll_id from employees), 'P1', 'staff sees the right record');
select pg_temp.expect((select count(*) from contracts), 1::bigint, 'staff sees only own contracts');
select pg_temp.expect((select count(*) from payslips), 1::bigint, 'staff sees only own payslips');
select pg_temp.expect((select count(*) from policies), 1::bigint, 'staff sees live policies only');
select pg_temp.expect((select count(*) from onboarding_tasks), 0::bigint, 'staff cannot see onboarding tasks');

update employees set job_title = 'Manager', payroll_id = 'HACK';
select pg_temp.expect((select payroll_id from employees), 'P1', 'staff cannot edit their record directly');

do $$ begin
  insert into policy_acknowledgements (policy_id, employee_id, recorded_by) values
    ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000c');
  raise exception 'FAIL: staff acknowledged for someone else';
exception when insufficient_privilege then null;
end $$;
insert into policy_acknowledgements (policy_id, employee_id, recorded_by) values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c');

select submit_starter_form('1990-01-31', '1 High St', null, 'London', 'W1H 1AA', '07700900000', null,
  'sam@example.com', 'Level 3', '[{"name": "Paediatric first aid", "achieved_on": "2025-05-01"}, {"name": ""}]'::jsonb);
select pg_temp.expect((select postcode from employees), 'W1H 1AA', 'starter form updates own record');
select pg_temp.expect((select count(*) from employee_qualifications), 1::bigint, 'starter form saves non-blank qualifications');

do $$ begin
  perform sign_contract('20000000-0000-0000-0000-000000000002', 'Sam One', '1.2.3.4', 'test');
  raise exception 'FAIL: staff signed someone else''s contract';
exception when raise_exception then
  if sqlerrm like 'FAIL%' then raise; end if;
end $$;
select sign_contract('20000000-0000-0000-0000-000000000001', 'Sam One', '1.2.3.4', 'test');
select pg_temp.expect((select status::text from contracts), 'signed', 'staff signs own contract');
do $$ begin
  perform sign_contract('20000000-0000-0000-0000-000000000001', 'Sam One', '1.2.3.4', 'test');
  raise exception 'FAIL: contract signed twice';
exception when raise_exception then
  if sqlerrm like 'FAIL%' then raise; end if;
end $$;
select pg_temp.sign_out();

select pg_temp.expect((select status::text from contracts where id = '20000000-0000-0000-0000-000000000002'),
  'sent', 'other contract untouched');
select pg_temp.expect((select job_title from employees where payroll_id = 'P1'), 'Room leader', 'manager edit kept');

-- Inactive / self-signed-up user sees nothing ---------------------------------
select pg_temp.sign_in('00000000-0000-0000-0000-00000000000e', 'aal2');
select pg_temp.expect((select count(*) from employees), 0::bigint, 'inactive user sees no employees');
select pg_temp.expect((select count(*) from policies), 0::bigint, 'inactive user sees no policies');
select pg_temp.sign_out();

-- Deactivated staff lose access ------------------------------------------------
update profiles set active = false where email = 'staff1@example.com';
select pg_temp.sign_in('00000000-0000-0000-0000-00000000000c', 'aal1');
select pg_temp.expect((select count(*) from employees), 0::bigint, 'deactivated staff sees nothing');
select pg_temp.expect((select count(*) from payslips), 0::bigint, 'deactivated staff sees no payslips');
select pg_temp.sign_out();

-- Signed-out (anon) sees nothing ---------------------------------------------
set role anon;
select pg_temp.expect((select count(*) from employees), 0::bigint, 'anon sees no employees');
select pg_temp.expect((select count(*) from policies), 0::bigint, 'anon sees no policies');
do $$ begin
  perform sign_contract('20000000-0000-0000-0000-000000000002', 'x', null, null);
  raise exception 'FAIL: anon called sign_contract';
exception when insufficient_privilege then null;
end $$;
reset role;
