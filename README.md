# Phosub

Phosub manages phone handover sessions for student squads. Mentors start and end sessions; students in the active squad record whether they submitted or retrieved a phone, with a reason where required.

## Prerequisites

- Node.js 22.6 or later
- pnpm 12.3.4 (the version pinned in `package.json`)
- A Supabase project for local integration testing

## Local setup

```bash
pnpm install --frozen-lockfile
```

Create `.env.local` with these variable names:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (server-side only; never use a `NEXT_PUBLIC_` prefix)

Do not commit `.env.local` or any file containing real credentials. The service-role key bypasses row-level security and must only be available to server code.

Review `supabase/schema.sql` before setting up a database. It is the repository's current schema definition, not an automatically applied migration. Apply database changes to a disposable local/test project first; this repository does not apply schema changes to a remote project automatically.

Start the app:

```bash
pnpm dev
```

Open `http://localhost:3000`.

## Checks

```bash
pnpm typecheck
pnpm test
pnpm build
```

The unit tests use Node's built-in test runner. The production build in CI uses placeholder Supabase configuration and does not connect to a real project. No production secrets are required for these checks.

## Workflow and data model

- The profile API derives roles from the verified email domain, but the current database insert policy does not prevent direct self-assignment of `mentor`. Do not treat this as secure mentor provisioning until a reviewed database migration adds a trusted mentor approval mechanism and direct-write tests pass.
- A squad can have at most one active session.
- Students can submit handover statuses only for their own active squad session.
- `handovers` stores the current status. `handover_events` stores status-change history.

The SQL file contains RLS policies and database triggers. API routes that use the service-role client must perform their own authorization checks because that client bypasses RLS.

## Troubleshooting

- `PGRST205` for a table means the connected project's schema cache cannot find that table. Confirm the local schema has been reviewed and applied to the intended test project, then refresh the schema cache if needed.
- A missing profile after email confirmation can be completed through the profile setup flow.
- Confirmation redirects must use an origin configured in Supabase Auth URL settings. Email delivery and confirmation requirements are controlled by Supabase Auth, not the client-side validator.
- If a server-side API returns a generic error, inspect the local server log. Never paste service-role keys, access tokens, passwords, or cookies into issue reports.
