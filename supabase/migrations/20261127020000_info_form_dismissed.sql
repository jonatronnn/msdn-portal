-- Lets a manager hide the Important information form prompt on a staff
-- record when they don't plan to send it.
alter table public.employees add column info_form_dismissed_at timestamptz;
