-- Uploading right to work evidence or a DBS certificate under Signed documents
-- now ticks the matching onboarding step, as a signed contract already does.
alter table public.onboarding_task_templates drop constraint onboarding_task_templates_automation_check;
alter table public.onboarding_task_templates add constraint onboarding_task_templates_automation_check
  check (automation in ('form_sent', 'form_returned', 'employment_details', 'contract_uploaded', 'famly', 'right_to_work', 'dbs'));
update public.onboarding_task_templates set automation = 'right_to_work' where title = 'Right to work checked' and automation is null;
update public.onboarding_task_templates set automation = 'dbs' where title = 'Enhanced DBS check completed' and automation is null;
update public.onboarding_tasks set automation = 'right_to_work' where title = 'Right to work checked' and automation is null;
update public.onboarding_tasks set automation = 'dbs' where title = 'Enhanced DBS check completed' and automation is null;
