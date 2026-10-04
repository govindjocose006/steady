# Steady Supabase backend foundation

Created 4 October 2026 in the owner's selected organisation, on the Free plan in Mumbai (`ap-south-1`). Project reference: `tyrcuqvgazilfaajqwdj`. [Dashboard](https://supabase.com/dashboard/project/tyrcuqvgazilfaajqwdj).

## Current state

This is an installed, verified backend foundation, **not a production cutover**. The running Steady site still uses Sites authentication and D1, including the existing private visitor invitation. No personal records, points, rewards, priorities or histories were migrated or changed. No Vercel deployment was created. No environment variables or sign-in behaviour were changed in the live site.

- All 20 application tables are installed, with all existing fields and uniqueness constraints represented. Text JSON and date fields retain the source serialization format intentionally; they are not auto-converted to timestamps or altered time zones.
- Every table requires an authenticated account owner for reads. Anonymous access is revoked. Browser writes are revoked pending atomic write APIs; setting up these tables alone does not enable saving through Supabase.
- The UUID owner is a Supabase Auth user, never a browser-supplied Sites header. Deleting an Auth user cannot cascade away historical records.
- Administrative identity mappings are in an unexposed, inaccessible schema. No email-based identity merge or live identity mapping has occurred.
- No secret keys, password, access tokens or personal records are committed. `database.types.ts` is generated from the installed schema. No database connection credential is needed to inspect it.

## Verification

`node scripts/verify-supabase-foundation.mjs` runs schema-contract and permissions regression checks without a network connection or real records. It is included in `npm run check` and the existing GitHub CI.

`tests/private_access.sql` was executed on the new project. It inserts two temporary fixture identities and one row per application table, tests ownership/other-account/missing-identity isolation and browser write denial, then rolls back. Result: 101 checks, zero failures. It must be run in one transaction using an administrative database connection. It does not test actual signed-in browser sessions or email delivery. Identity sequence gaps after a rolled-back fixture are harmless.

Migrations are committed with the exact versions returned by Supabase's migration history. Do not reapply them manually under another version. Use the pinned CLI version 2.119.0 for subsequent migration creation, inspect `--help`, and verify the remote migration list before pushing.

## Required before activation

1. Add and test Supabase Auth in an isolated deployment: verified server-side sessions, session refresh, safe callback URLs, sign-out and in-memory draft handling. Configure the verified deployment URL and redirect allowlist. Configure invitation-only access and working email delivery; these settings and real sessions are not yet verified.
2. Port the existing SQLite queries and atomic batches to Postgres transactions. Preserve optimistic versions and idempotency keys. Implement application/task/award/history updates together; don't replace this with independent REST writes. Only then grant the minimum necessary write permissions or expose validated transaction APIs. Never expose a service-role/secret key to a browser.
3. Authenticate the owner and explicitly map the old Sites identity to the verified new Auth user. Export/import privately, retain every original record ID, audit sequence, snapshot, point award and ledger amount, and validate table counts, digests, balances and date totals. Do not put exports or notes in this public repository. Map the friend separately; don't merge users.
4. Test two real accounts, cross-account denial, duplicate completions, submission archive behaviour, corrections, reward spending/refunds, linked tasks, timers, drafts and refresh. Use Asia/Kolkata for progress dates.
5. Publish an isolated Vercel preview if that host is chosen, verify it, then carry out a controlled cutover with a final data reconciliation. Retain the original private Sites deployment and database for rollback. Avoid simultaneous writes to both backends. Nothing in this foundation automatically triggers a migration or changes live hosting.

The current application trusts authenticated identity headers only because Sites supplies them. Those headers are **not authentication on Vercel**. Do not deploy the unmodified application to another host.

Public browser configuration, once the application adapter is implemented, will be `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Retrieve a publishable key securely from the project's Connect dialog. Credentials are configured in hosting environment settings, never source files. A Supabase plugin connection authorises project administration; it is not the application's runtime sign-in.
