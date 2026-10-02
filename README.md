# Steady

## Repository development

This branch contains the full React/TypeScript app, synchronized from the private live Steady site on 2 October 2026. Use this source for incremental application development. The previous standalone export is preserved at `legacy/index.html`; it is a separate offline snapshot, not the live app or its saved database.

### Install and check

Use Node.js 24 or newer. From the repository folder:

```bash
npm run install:ci
npm run check
npm run build
```

`check` runs all five API/data verification suites (317 checks) and TypeScript. Tests use an isolated temporary SQLite database and fake identities; they never modify live records.

### Current hosting

The live site remains at https://steady-govind.govind-jocose.chatgpt.site/ with its existing private ChatGPT sign-in and Sites-managed D1 storage. Copying source to GitHub does not migrate saved data or connect GitHub deployments to Sites. Publishing changes to the current site still uses the authorized Sites publishing workflow.

This source is not yet a standalone Vercel deployment: the Cloudflare Worker/database adapter and platform-provided authentication need a deliberate migration first. Before that migration, keep the live site and its current data as the production app. Do not replace sign-in with a fake identity or deploy an unprotected data API.

### Keep personal records private

Only source code and public opportunity metadata belong in Git. Database exports, local runtime databases, account IDs, credentials and environment files are excluded. The optional one-time shortlist ownership repair uses `STEADY_LEGACY_IMPORT_OWNER_ID` and `STEADY_LEGACY_IMPORT_OWNER_EMAIL` from server configuration and is disabled when these values are absent. The already repaired live database does not need it again.

### Continue step by step

For each requested feature, inspect the existing implementation, preserve its data/history, implement a focused change, run `npm run check`, and verify the build. Commit the change to this repository. Keep hosting/data migration separate from feature work until private authentication, storage import, completion accounting and refresh persistence have been verified on the new host.


A private personal workspace built with React, TypeScript, Vinext, and a Sites-managed D1 database.

## Daily foundation

- Today groups editable tasks by PhD applications, CSIR NET, and research.
- Each task has an activity type, due date, and estimated duration.
- Applications count unique recorded submissions today and yesterday, with a target of two and a stretch of three. Unlinked earlier submission tasks retain their original credit until linked to a record.
- Lectures count completions today, with a target of two and a stretch of three. Revision and practice are separate task types.
- Research progress is completed tasks out of tasks due today, including unfinished earlier tasks.
- Future open tasks appear in Upcoming. Older changes remain accessible in History.
- Completion and undo update progress. History retains snapshots before and after edits.
- Dates and completion credit use Asia/Kolkata. Server time determines the day.
- The app starts empty. There are no seeded personal records.

## Application tracker

Open Applications and choose Add application. Only the institution is required. Position details, deadline, link, notes, and next action can be added later. Each application has an editable document checklist, seven pipeline stages, a recorded submission date, linked tasks, and its own audit history. Stage and Due soon filters help find deadlines that need attention.

Use Plan this action to choose a due date and estimated minutes. The linked task appears in Today or Upcoming. Repeating a plan reuses the existing task for that application's normalized next action. Preparation never counts as a submission. Completing a linked submission task records the India date on its application; multiple tasks cannot count that application twice.

Record submission, Correct date, and Undo submission update the progress credit without erasing audit history. Moving to Interview, Offer, Rejected, or Withdrawn preserves the submission date. Undoing the task that originally recorded a date clears that date, unless it has since been corrected manually. Existing completed submission tasks can be linked to an application through the task editor or converted into records from Applications; their earlier history stays intact.

## CSIR NET study and research

Study supports named subjects/topics, individual lectures, practice sessions, and revision/rewatch sessions. Saving a record plans one linked daily task. Start/Resume preserves the lecture's notes and where-you-left-off marker. Completion, undo, title/date/duration edits, and completion-date corrections synchronize the record and daily task in one database batch. Lectures count once on their recorded India completion date; practice and revision remain separate. Subject cards show completed/total lectures.

Study → Targets & exam lets you edit the default daily lecture target (2), stretch target (3), and a manually entered exam date. The exam date starts unset. Plan revision / rewatch creates a separate linked session, with a date and duration you choose. The same source, normalized title, and planned date cannot create duplicate follow-up records.

Research supports named projects, editable categories, active tasks, and dated completed work. Tasks store estimated/actual time, notes, outcomes, and next steps. Completed experiments count regardless of whether the result is conclusive. Research has no default quota; Research target optionally enables a daily target that can be turned off again.

For one day, plan two lectures in Study → Lectures, one session in Practice, and one task in Research. Choose the same date on all four records. All four appear in Today when due; future dates appear in Upcoming. Every daily task links back to its record. Earlier unlinked study/research tasks can be converted into records while reusing their existing task and retaining history and a single progress count.

## Points and personal rewards

Rewards shows available points, corrected total earned, and a dated ledger of awards, corrections, redemptions and refunds. Starting values are application 80, lecture 20, practice/revision 20, research 40, phone-free focus 10, and daily workout 10. Point values are editable; optional custom values on preparation/other tasks default to zero. Only new completions earn first awards. There is no retroactive backfill for earlier completed work, date corrections, later application stages or legacy record conversion.

Canonical activity keys ensure that daily task and linked record completion share one award. Award rows freeze their original amount, including after undo/recompletion. Every activity mutation and ledger change runs in the same guarded atomic batch. Date corrections have zero net credit or merge overlapping daily awards. Corrections are permitted after spending: a negative balance explains the shortfall and prevents further redemptions until it recovers. Changing settings affects future first awards.

Add rewards using a name and cost, with an optional description. Film evening (300), Small personal treat (100) and Outing (600) are editable form examples. Archive keeps all history. Redeem reviews the cost, checks the fresh account balance atomically and stores a snapshot of the reward name/cost. Undo issues one corresponding refund of the original cost. Spending never reduces earned total. Rest, meals and sleep remain independent of rewards, and missed days never deduct points.

## Habits and workouts

Habits → Phone use stores manually entered distracting minutes by India date, separately from purposeful videos/calls/use. Its optional daily target starts unset. No system-wide measurement or app blocking is claimed.

Habits → Focus timer defaults to 25 editable minutes. Its saved absolute server deadline and precise paused milliseconds support refresh/background recovery, pause/resume and cancellation. An elapsed timer needs explicit phone-free confirmation to earn points. The editable default limit is three rewarded sessions per India day. Cancelled or non-phone-free sessions remain recorded without awards. Focus confirmation/date correction can be corrected without losing history or adding duplicate awards.

Habits → Workouts plans/logs an activity, date, duration and optional notes, or a planned rest day. The editable duration target starts at 15 minutes. Workout records share one daily award across all entries and linked checkboxes. Undoing the last completed entry reverses it. Completion, undo and date changes keep the daily task and workout record consistent. Today keeps the three main goals separate and adds a compact habits/points strip; scheduled workouts appear in Today and Upcoming.

## Persistence and privacy

Sites remains owner-private. Protected pages use ChatGPT authentication. Every task and history query is scoped to the signed-in user ID supplied by the platform. Missing identity is rejected; there is no fallback identity. Personal data is never saved in browser localStorage.

Writes use an atomic database batch for tasks, applications, study/research records, catalogs, points, habits, rewards, settings, and their history. Reads return one consistent database snapshot. Version checks prevent stale edits. Operation IDs protect against duplicate saves after a retry. Failed saves keep the form open. Successful saves are acknowledged only after the database response.

Production schema is managed by immutable Drizzle migrations in `drizzle/`. Never ship local runtime databases or test records.

## Development and checks

Use the Sites managed preview and build workflows. The source uses the bundled pnpm dependencies and scripts.

Run `node scripts/verify-foundation.mjs` for the core API and date checks. The harness executes the real route handlers against an isolated SQLite database and supplies only test identity and the D1 adapter. It checks create/edit/complete/undo, database close/reopen, duplicate requests, stale edits, validation, cross-account isolation, history paging, and India midnight boundaries. No fixtures touch the deployed database.

Run `node scripts/verify-applications.mjs` for migration preservation, application fields and checklists, linked task reuse, submission counting, corrections and undo, later stages, legacy task integration, durable saving after reopening the database, and rollback after interrupted writes. The original two suites cover 83 checks. Run `node scripts/verify-workspace.mjs` for 82 further checks, including preservation of pre-upgrade application data and audit snapshots, catalogs, partial lectures, consistent task links, daily targets, practice/revision, research outcomes, duplicate follow-ups, date corrections, atomic recovery, and durable saving. The original three suites cover 165 checks. Run `node scripts/verify-motivation.mjs` for 100 further checks of migration preservation, awards and frozen amounts, linked-task uniqueness, correction/undo, daily workouts/rest, manual logs, durable timers, focus caps, midnight rollover, reward spends/refunds, concurrent balance checks, negative balances, retries, privacy, and atomic rollback. The four suites cover 265 checks.

Run `node node_modules/typescript/bin/tsc --noEmit --incremental false` to check types.

The supervised preview runs, but the required control-browser support is unavailable. Consequently, browser refresh, visual desktop/mobile QA, and browser WebMCP validation remain unverified. API checks exercise durable database reopen/reload separately. The app includes responsive layouts, an accessible Radix dialog, labelled task actions, keyboard focus states, reduced-motion support, and a feature-detected `start_task_creation` WebMCP tool that only opens the normal editor.

## Later phases

Weekly reviews remain for a later phase.

## Verified opportunity shortlist

The 2 October 2026 shortlist stores seven ranked positions in six application workflows. UFAST PM4 and PM5 are preferences within one record with separate project adverts, ranks and fit notes. Upcoming lists active opportunities independently of daily tasks, defaults to deadline order and also supports fit-priority order. Applications has separate Pending and Application history sections, stage filters, search (including IMPRS Quantum Materials) and editable priority/fit notes. Rank means research fit and interest, never admission probability.

Deadline badges use India display dates. Exact official closing instants are stored only when stated: Halle closes 15 November at 23:59 CET, displayed as 16 November 04:29 IST. Other adverts retain date-only deadlines. Basel’s advert says before 31 December and may fill early; MPGC-QM has conflicting older recruitment text alongside its current OPEN notice. The saved verification notes flag these qualifications.

Submission hides the application and its linked tasks from active lists without deleting records. History keeps archived details and one application submission event per workflow; linked submission-task audit rows remain saved but are not repeated as separate submission entries in the main History view. Manual completion/date correction/undo synchronizes linked submission checkboxes, while the canonical application award is maintained once. Later stages preserve submission dates and awards.

`node scripts/verify-opportunities.mjs` adds 52 checks of import deduplication, preservation, editing, sorts/badge boundaries, exact closing times, rendering, shared UFAST awards/history, archive/undo, persistence and isolation. Opportunity imports use the signed-in per-Site user identity. Ownership recovery is narrowly scoped, idempotent, and preserves the imported audit snapshots. No seed data is placed in schema migrations.
