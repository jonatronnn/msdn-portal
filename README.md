# Montagu Square Day Nursery portal

A private web app for running the nursery. It is built from **modules**; the first
is **Staff**, and more (e.g. children's onboarding) can be added alongside it.

Built with Next.js 16, Supabase (Postgres database, logins, file storage) and
Tailwind CSS. Designed to be hosted on Vercel, with Supabase's London region.

## Who sees what

| | Owner / admin | Manager | Staff |
|---|---|---|---|
| Two-step sign-in (authenticator app) | Required | Required | — |
| Staff directory, records, contracts, onboarding | ✔ | ✔ | Own record only |
| Payslips | All (upload & view) | Own only | Own only |
| P45s | All (upload & view) | Own only | Own only |
| Policies & handbook | Publish & archive | Read, see who's acknowledged | Read & acknowledge |
| Onboarding checklist template | Edit | View | — |
| Users (invite, roles, deactivate, reset 2FA) | ✔ | — | — |
| Notification settings | ✔ | — | — |

These rules are enforced **in the database** (Postgres row-level security), not
just by hiding pages, and admins/managers get nothing beyond a staff member's
access until they have completed two-step sign-in. Files (contracts, policies,
payslips) live in private storage and are only handed out as one-minute links
after the database confirms the person may see them.

## What's in the Staff module

- **Staff directory** – current staff by default, toggle to all staff (leavers).
  Name, DOB, address, phone numbers, email, start date, qualification level,
  other qualifications, job title, employee ID, payroll ID, National Insurance
  number, emergency contact, leave date and reason, and length of service (worked out automatically; stops at the leave date).
- **Contracts** – send a PDF for electronic signature (the employee reads it,
  ticks to agree and types their name; the date, time, IP address and a
  SHA-256 fingerprint of the exact file are recorded), or upload a paper-signed copy.
- **Policy acknowledgements** – tick boxes on each staff record, and staff can
  confirm "I have read and understood this" themselves in the handbook.
- **Onboarding** – every new employee gets the standard checklist (editable by
  admins); managers tick tasks off. Invite a new starter to the portal and they
  fill in the **new starter form** (including NI number, emergency contact and
  an optional P45 upload), which goes straight into their record.
- **Policies & handbook** – PDFs for everyone to read.
- **Payslips** – export the PDFs from QuickBooks and bulk-upload them; each is
  matched to an employee by the payroll ID in its file name.
- **Email notifications** – birthday and work-anniversary emails on the day, and
  a weekly email of the coming week's birthdays, anniversaries, starters and
  leavers, to the addresses set under Admin → Notifications.

## Running it locally

Needs Node 20.9+ and Docker.

```bash
npm install
npx supabase start            # local database, auth, storage and a test mailbox
npx supabase status -o env    # copy the keys into .env.local (see .env.example)
npm run dev
node --env-file=.env.local scripts/create-admin.mjs you@example.com "Your Name"
```

Invitation and password emails appear in the local mailbox at
http://127.0.0.1:54324. Open the invite link, set a password, then set up
two-step sign-in with an authenticator app.

## Checks

```bash
npm run lint
npm run typecheck
npm test          # unit tests (dates, length of service, payslip matching)
npm run test:db   # access-rule tests against a throwaway Postgres (needs initdb/pg_ctl)
```

After changing the database, regenerate the TypeScript types with
`npm run db:types` (local Supabase must be running).

## Going live

1. **Supabase** – create a project in the **London (eu-west-2)** region. Then:
   ```bash
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```
   In the Supabase dashboard:
   - *Authentication → Sign In / Providers*: turn **off** "Allow new users to sign up";
     keep the **Email** provider **on** (turning it off blocks all logins).
   - *Authentication → Multi-Factor*: enable **TOTP (authenticator app)**.
   - *Authentication → URL Configuration*: set **Site URL** to the portal's
     address, and add `https://<your-domain>/auth/confirm` to Redirect URLs.
   - *Authentication → Emails*: paste in `supabase/templates/invite.html` and
     `recovery.html` (the links must point to `/auth/confirm`), and set up
     custom SMTP so invitations come from the nursery's domain.
2. **Email** – create a [Resend](https://resend.com) account, verify the
   nursery's domain and create an API key (used for contract and notification emails).
3. **Vercel** – import the repository and set the environment variables from
   `.env.example` (`SUPABASE_SECRET_KEY`, `CRON_SECRET` and `RESEND_API_KEY` are
   secrets). `vercel.json` runs the notification job every morning and pins the
   app to the London region.
4. Create the first owner account:
   `node --env-file=.env.production scripts/create-admin.mjs owner@… "Name"`,
   then invite everyone else from **Admin → Users**.

## Adding a module

1. Add tables and their access rules in a new file in `supabase/migrations/`,
   using `is_admin()`, `is_manager_or_admin()` and `current_employee_id()`.
   Add tests for the rules to `supabase/tests/access_rules.sql`.
2. Run `npm run db:types`.
3. Add pages under `src/app/(portal)/<module>/`, calling `requireSession(...)`
   at the top of every page and server action.
4. Add the links to `src/modules/registry.ts` with the roles that should see them.

## Not done yet

- **Holiday allowance from Famly** – needs Famly API access and documentation
  to confirm staff leave data is available.
- **QuickBooks** – payslips are uploaded as PDFs; there's no direct connection.
  Intuit's Payroll API is restricted to approved developers and it's unclear
  whether it covers UK payroll. QuickBooks UK already publishes payslips to
  employees through QuickBooks Workforce.
- **Children's onboarding module** – to be specified.
