# Independent runtime verification — 5 October 2026

- Passed all 581 original application behavioral checks and 352 original foundation/schema checks.
- Passed 68 real Postgres/API checks: atomic batches, rollback, linked completion, frozen points, refunds, submission correction, shared daily workout award, settings, planning and owner isolation.
- Passed 22 auth/session safeguards: verified Google identity, rejected anonymous/unconfirmed/provider mismatch, optional allowlist, local redirects, CSRF origin, and account-bound drafts.
- Passed TypeScript, strict lint, native Next.js production build and unauthenticated preview HTTP checks. GitHub CI passed for the independent implementation.
- Supabase migrations and the server runtime key are installed. A rollback-only remote transaction/access test passed; the security advisor reported no findings.
- Production is live at https://steady-kappa-two.vercel.app/ using commit bc891e02a40d080bf321c605e1a6a7e9d67c20b7. Vercel reported READY. Supabase Site URL and the exact production /auth/callback redirect were saved.
- Real Google sign-in succeeded. The server-verified Google account opened Today, displayed Saved, and recovered the signed-in session after a browser reload. Desktop Today was visually checked.
- Not verified in production: writes and their persistence, logout/expired-session recovery, two real signed-in users, phone layouts, keyboard/zoom, and background focus-timer behavior. Automated isolated tests do not replace those checks.
- Original Sites hosting, permissions and records remain unchanged. No personal records have been imported. The authorized Sites export was inspected across all 20 tables, but three application-history snapshot values were truncated by the export tool, even at one row per request. Import is blocked until a complete lossless snapshot is available; do not reconstruct or drop these values.
- Vercel remains Hobby/free. No paid upgrade or payment method was added.

## Earlier Sites verification history

# Verification and source workflow

Both Sites and GitHub `app-source` use the same application, migrations, checks, package scripts and recovery helper. The `.openai/hosting.json` project binding remains unchanged. GitHub retains its `legacy/` offline export. Ignored checkout-local tool files can differ; they are not application source.

Run `npm run check` for all isolated API/model/component suites, TypeScript, and lint with zero warnings permitted. Run `npm run build` separately. GitHub Actions runs both on `app-source`, `main`, and pull requests; it has read-only repository permissions and no deployment or database secrets. A workflow file does not prove a remote CI run passed—check its run result after pushing.

Tests use temporary SQLite databases and invented identities. They never access the live owner's records. History tests include more than one page in every stream, record-specific cursors, ownership boundaries, failure/retry, full-ledger balances, weekly spending/refunds, and earlier study target settings.

History pages contain up to 50 immutable changes with exclusive sequence cursors. Load older changes retrieves more without saving anything. Initial state keeps complete current records, award rows, and compact review evidence. Points balances are computed across the whole ledger; weekly spending/refunds use complete daily aggregates. Current records and settings evidence are deliberately retained for review accuracy; this is not a claim that every growing collection is bounded.

The completed secret-only requested-application import endpoint returns 410. Ordinary signed-in application creation/editing and the normal import remain. The earlier ownership recovery is disabled by default, configured only through optional server settings, and contains no personal identifiers in source. API failures log fixed operation names rather than exception objects or personal data.

## Optional authenticated browser suite

`npm run check:browser` requires Playwright in the verification environment and an explicitly supplied, dedicated, already signed-in Chromium CDP test session. It creates a temporary page in that context, then closes it. It does not save records or authentication state, take private screenshots, or inject fake identity headers. It exercises page access, laptop/phone clipping, dirty-task Keep/Discard, ordinary Back/Forward, basic keyboard reachability, and refresh without data changes.

Use a dedicated verification browser, not your everyday browser. Set `STEADY_BROWSER_TEST_SESSION=1` to acknowledge connection cleanup. Set `STEADY_BROWSER_ORIGIN` to the authorized origin and `STEADY_BROWSER_CDP` to the already-running browser endpoint. `STEADY_PLAYWRIGHT_MODULE` can point to an externally installed Playwright module. Do not commit any browser profile, cookie, CDP credential or storage-state file. Browser tests are opt-in and excluded from unattended CI because this private Site requires real account authentication.

In managed Sites workspaces, use the supported control-browser preview workflow. This script refuses to substitute a CDP path there. Missing browser support exits with code 2 and reports **NOT VERIFIED**, never PASS.

Still check 200% zoom, modal focus trapping/return, screen-reader announcements, sign-in expiry/recovery, and the focus timer through a real background-tab session manually. The small suite does not claim to cover these.
