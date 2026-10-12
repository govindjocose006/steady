# Android preview verification — 12 October 2026

Build: 0.1.0-preview, package in.steady.app.preview; Android 8+ (API 26), target API 35.

## Passed
- Gradle :app:testDebugUnitTest: 14 tests, zero failures/errors.
- India-time daily scheduling, exact-boundary next day, year rollover.
- Focus duration limits, elapsed deadline, pause, same-boot clock corrections, reboot fallback and overdue completion calculations.
- Static account boundary: no API calls, embedded WebView or internet permission; immutable PendingIntents, non-exported alarm receiver and disabled backup.
- Android lint: no issues found.
- Debug APK build successful; APK Signature Scheme v2 verification passed.
- Packaged manifest inspected: only POST_NOTIFICATIONS and RECEIVE_BOOT_COMPLETED permissions.
- No web source, Supabase configuration, user data, history, points, rewards, production branch or hosting changes.

## Not verified on Android hardware/emulator
- Installing/running the APK, native layout, TalkBack and large-font behavior.
- Browser selection, Google sign-in round-trip, custom-tab offline task access and reconnect sync.
- Notification consent/denial/settings, delivery while asleep, reboot and force-stop restoration.
- Actual process-death preference recovery and device-specific battery restrictions.

The local Java tests exercise rules and source boundaries, not these Android runtime behaviors. This is a preview, debug-signed and not approved for Play Store distribution. Its timer is deliberately device-only and never awards points. The existing website remains responsible for account records and offline syncing.
