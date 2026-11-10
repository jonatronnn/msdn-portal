-- Link staff records to Famly. The sync itself is done by the app with the
-- Famly API token; this stores which Famly employee each record matches.

alter table public.employees
  add column famly_id text unique,
  -- The Famly room (group) they're in; Famly needs one for every employee.
  add column famly_group_id text,
  add column famly_synced_at timestamptz;

-- "Added to Famly" now ticks itself when someone is sent to or imported from Famly.
alter table public.onboarding_task_templates drop constraint onboarding_task_templates_automation_check;
alter table public.onboarding_task_templates add constraint onboarding_task_templates_automation_check
  check (automation in ('form_sent', 'form_returned', 'employment_details', 'contract_uploaded', 'payroll_ref', 'famly'));
update public.onboarding_task_templates set automation = 'famly' where title = 'Added to Famly';
update public.onboarding_tasks set automation = 'famly' where title = 'Added to Famly' and automation is null;
