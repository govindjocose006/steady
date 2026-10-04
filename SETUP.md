# Independent Steady setup

## Current status

The `supabase-app` branch contains the complete existing application plus verified server-side Google identities and transactional Supabase storage. The live private Sites app is unchanged. Supabase migrations are installed, but real Google sign-in, Vercel deployment and transfer of existing records are not complete.

Vercel access works through the default account (omit an explicit team scope). The account was verified on Hobby/free. Next.js build settings and the required server environment are configured. Google is enabled in Supabase. Deployment and real sign-in verification are in progress; do not activate billing or a paid integration.

## Google provider

1. In Google Auth Platform, create a Web application OAuth client with only openid, email and profile scopes. Use the final Vercel origin as the authorized JavaScript origin.
2. Add the exact redirect URI `https://tyrcuqvgazilfaajqwdj.supabase.co/auth/v1/callback`.
3. Enter the client ID and secret directly in Supabase Authentication → Sign In / Providers → Google. Never send the secret through chat or commit it.
4. In Supabase URL Configuration set the final app origin as Site URL and allow its `/auth/callback` redirect. Allow only intended production/preview origins.
5. If Google consent remains in Testing, explicitly add the owner and invited friends as test users. Test each with a real sign-in; a button alone does not verify OAuth.

## Server environment

Configure these in Vercel, never in tracked files:

- `NEXT_PUBLIC_SUPABASE_URL`: project URL above.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: project's publishable key (not service-role).
- `STEADY_DATABASE_SERVER_KEY`: a freshly generated random secret of at least 32 bytes. Store only its SHA-256 hex hash in `steady_private.runtime_keys` using an administrator connection. The runtime key is provisioned securely in Vercel; only its hash is stored in the database.
- Optional `STEADY_ALLOWED_EMAILS`: comma-separated Google emails if access should be limited to invited friends. Without this restriction, verified Google users can create their own isolated workspace.

Use Next.js framework, Node24, repository root, branch `supabase-app`, `pnpm install --frozen-lockfile` and `pnpm build`. No Cloudflare binding is required for this branch. Keep `steady_data` and `steady_private` **out** of Supabase's exposed API schemas. Browser clients cannot call the transaction function without the separate server secret; RLS also restricts every statement to the verified user. Never use a service-role key for app requests.

## Existing owner data

Do not match accounts by unverified metadata or automatically by email. First sign in with the owner's Google account and verify the resulting Supabase UUID. Export a consistent owner-scoped snapshot from Sites through its authorized database tooling. Keep that private export outside the repository. Explicitly map the Sites owner ID to the verified UUID, preserve record IDs, timestamps, JSON snapshots, ledger amounts, versions and all 20 tables. Import into an empty target account in one administrator transaction, validate per-table counts and canonical hashes, and verify key workflows before changing the owner's working link. Leave Sites available for rollback; avoid simultaneous edits during final snapshot/import. This transfer has not been performed.

## Verification

`pnpm check` covers the original application regressions, schema checks, real Postgres API transactions and auth safeguards, plus TypeScript and strict lint. `pnpm build` is a native Next.js production build. The Postgres harness uses an isolated in-memory database with synthetic users and never uses the live project. `supabase/tests/transaction_access.sql` is a rollback-only remote access test.

After deployment verify actual Google login/logout, refresh/session expiry, two-user isolation, mobile/desktop layouts and private data persistence. These require provider credentials and a reachable deployment; unit tests do not replace them.
