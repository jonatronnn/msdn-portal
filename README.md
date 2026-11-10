# Montagu Square Day Nursery portal

A private web app for running the nursery. It is built from **modules**; the first
is **Staff**, and more (e.g. children's onboarding) can be added alongside it.

Built with Next.js 16, Supabase (Postgres database, logins, file storage) and
Tailwind CSS. Designed to be hosted on Vercel, with Supabase's London region.

## Who sees what

Only the owner and managers log in. Staff don't have accounts: new starters fill
in their details through a one-off emailed link.

| | Owner | Manager |
|---|---|---|
| Two-step sign-in (authenticator app) | Required | Required |
| Staff records, training, contracts, onboarding | ✔ | ✔ |
| Bank details | View and change | Only sees whether they're on file |
| Training types and new starter checklist | Edit | — |
| New children (starter checklists) | ✔ | ✔ |
| Children's checklist template | Edit | View |
| Users (invite, roles, deactivate, reset 2FA) | ✔ | — |

These rules are enforced **in the database** (Postgres row-level security), not
just by hiding pages, and nobody gets any access until they've completed
two-step sign-in. Bank details are also **encrypted** by the app before they're
stored (AES-256-GCM, key in `BANK_DETAILS_KEY`). Contract PDFs live in private
storage and are only handed out as one-minute links.

## What's in the Staff module

- **Staff directory** – current staff with length of service (years and months)
  and how long until their next major work anniversary (1, 5, 10, 15 or 20
  years). Former staff are in the **Archive**, with leave date and reason.
- **Staff records** – the details managers enter (name, email, job title, start
  date, contract type / end date / notice period / probation, working pattern,
  contracted hours, pay rate, qualification level and date), the details the
  employee gives on their form (date of birth, mobile, home address, emergency
  contact, NI number, bank details) and the payroll reference added afterwards.
  The record lists anything still to add. Employment is ended from the record
  (leave date and reason), which moves them to the archive after that date.
- **Training** – first aid, safeguarding, FGM awareness and so on, with
  completion and expiry dates. The expiry is worked out from the course length
  if left blank, and expired or soon-to-expire training is flagged on the
  record and the dashboard. The owner edits the list of training types.
- **Contract** – upload the signed contract PDF.
- **Onboarding** – *New starter*: enter their name and email and the portal
  creates their record and checklist and emails them the **Important information
  form** (a one-off link, valid for 14 days). What they submit goes straight into
  their record. Checklist steps record who ticked them and when; these tick
  themselves: form sent, form returned, employment details completed, signed
  contract uploaded, and payroll reference added. If email isn't set up, the
  manager is shown the link to send another way.
- **Dashboard** – major anniversaries and training to renew in the next 60
  days, who is being onboarded, and an **email list**: tick current staff (or
  select all) to get their addresses ready to paste into an email.

## What's in the Children module

- **New children** – add each new child (name and provisional start date) and
  they get the standard starter checklist, based on the Early Years enrolment
  checklist (tour booked, registration form, deposit, contract, key person,
  settling-in and so on). Managers tick steps off; each tick records who did it
  and when, and every step has a notes box. The list shows how far each child
  has got and the next step due. Admins edit the standard steps. Famly still
  holds the child's full registration details.

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
npm test          # unit tests (dates, anniversaries, NI and bank checks, encryption)
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
   nursery's domain and create an API key (used for the Important information form).
3. **Vercel** – import the repository and set the environment variables from
   `.env.example` (`SUPABASE_SECRET_KEY`, `BANK_DETAILS_KEY` and `RESEND_API_KEY`
   are secrets). Generate `BANK_DETAILS_KEY` with `openssl rand -base64 32` and
   keep a copy somewhere safe: without it, stored bank details can't be read.
   `vercel.json` pins the app to the London region.
4. Create the first owner account:
   `node --env-file=.env.production scripts/create-admin.mjs owner@… "Name"`,
   then invite everyone else from **Admin → Users**.

## Adding a module

1. Add tables and their access rules in a new file in `supabase/migrations/`,
   using `is_admin()` (owner) and `is_manager_or_admin()`.
   Add tests for the rules to `supabase/tests/access_rules.sql`.
2. Run `npm run db:types`.
3. Add pages under `src/app/(portal)/<module>/`, calling `requireSession(...)`
   at the top of every page and server action.
4. Add the links to `src/modules/registry.ts` with the roles that should see them.

## Not done yet

- **Famly sync** – syncing staff details to and from Famly, waiting on access
  to Famly's API documentation and a token.
