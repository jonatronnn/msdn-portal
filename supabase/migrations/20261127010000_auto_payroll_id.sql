-- New starters now get their employee / payroll ID (PR070, PR071, ...)
-- automatically, so a filled-in ID no longer means they've been added to
-- payroll in QuickBooks. The "Added to payroll" step is ticked by hand.
update public.onboarding_task_templates set automation = null where automation = 'payroll_ref';
update public.onboarding_tasks set automation = null where automation = 'payroll_ref' and completed_at is null;
