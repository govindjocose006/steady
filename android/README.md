# Steady Android preview 0.1

Native Android companion for the existing Steady web workspace. Android 8+ and a browser required. This preview is not a Play Store release or a bundled native rewrite.

## Included
- Open existing private Steady via Android Custom Tabs, preserving browser OAuth and storage. The browser toolbar can remain visible. No embedded WebView sign-in.
- Open existing offline tasks. Enable offline in the same browser while online first. Browser service worker and queued sync remain responsible for offline work.
- Optional daily reminder in Asia/Kolkata. Off initially. Generic notification wording.
- Device-only focus timer (1–180 min), start/pause/resume/cancel, persisted across process death. Monotonic during a boot; wall deadline after reboot.
- Notification permission handling and reboot/update alarm restoration; scrollable native controls, form labels and system-bar insets.

## Limits and privacy
Native reminders/timer do not read or modify web records, history, points or targets. They are not linked task reminders or rewarded sessions. Use the web focus tracker for rewards. There is no usage tracking, app blocking, biometric lock, widget, analytics, purchase or subscription. Native app does not request internet permission; the browser provides the workspace.

Android alarms are inexact: battery saving and Doze may delay notifications. Force-stop suppresses alarms until reopening. Manual clock changes across reboot can affect timer recovery. Same-boot clock changes do not change the timer.

Only generic reminder/timer settings are saved in private preferences. Android backup disabled. Browser storage is managed separately. Sign-out of Steady does not reset generic native settings. No API keys or credentials packaged.

## Build
JDK 17, Gradle 8.13, Android SDK platform 35 and build-tools 35.0.0:

```
cd android
gradle :app:testDebugUnitTest :app:lintDebug :app:assembleDebug
```
Set ANDROID_HOME or sdk.dir in ignored local.properties. APK: app/build/outputs/apk/debug/app-debug.apk.

The delivered build is debug-signed for direct preview installation. Future distribution requires an owner-held release signing key and stable package ID. Never commit keys. Another machine's debug signing key may require uninstalling this preview before an update; uninstall removes native settings, not server records. Do not publish this debug APK to Play.

## Verification
Unit tests cover IST scheduling, midnight/year boundaries, duration bounds, pause, reboot and clock correction. Build/lint results accompany delivery. Device-only checks must still cover installation, OAuth round-trip, permission denial, background alerts, reboot, airplane-mode access, font scaling and browser choice. No physical-device test is claimed without running it.
