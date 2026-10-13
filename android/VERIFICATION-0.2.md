# Preview 0.2 audit fixes — 13 October 2026

- APK metadata: in.steady.app.preview, versionCode 2, versionName 0.2.0-preview.
- 14 Android JVM tests passed (3 boundary and 11 time-rule tests); zero failures/errors in retained XML reports.
- APK assembled and APK Signature Scheme v2 verified using Android build-tools 35 apksigner.
- Android lint completion was not confirmed; the session ended before its final report was retained.
- Native channel-settings flow and new button spacing have not been tested on hardware/emulator.
- Web: full pnpm check and production build passed; signed-out HTTP smoke checks passed.
- Isolated Chromium checks passed: startup sync, draft retention on focus, sync after edit, and overflow checks at 320/390/768/1366 px. Nine workspace pages were checked with fixture data; no live user records were modified. Today, Study and offline screenshots were visually inspected.
- Added regression coverage for failed post-sync refresh rejecting stale snapshots and retaining subsequent queued edits.
- New debug signing identity; an existing preview may require reinstall, resetting only native timer/reminder settings. No Supabase migrations or access-setting changes.
