# Wake Up Ya Bish App Store Metadata

## App Information

- Name: Wake Up Ya Bish
- Subtitle: Retro alarm clock with attitude
- Bundle ID: com.eb28.alarmclock
- Version: 1.1.0
- Build: 9
- Primary category: Productivity
- Secondary category: Lifestyle
- Support URL: https://eb28.co/alarmclock/support/
- Privacy Policy URL: https://eb28.co/alarmclock/privacy/

## Promotional Text

Wake up with retro visuals, loud personality, and a morning dashboard that keeps your next move in view.

## Description

Wake Up Ya Bish is a loud-mouthed retro alarm clock built to make mornings harder to ignore.

Set a daily alarm, spin up fast countdown timers, preview a lineup of motivational alarm sounds, and keep your next event visible while you get moving. The app stores your alarm state on-device so it is ready when you open it again, and it can optionally read your calendar to surface the next event on your schedule.

Features:

- Daily alarm with customizable sound choices
- Quick countdown timers for short focus sessions and breaks
- Retro-styled clock interface with big, glanceable time states
- Optional calendar awareness to show the next upcoming event
- Habit checkpoint flow designed to push momentum after the alarm stops

Wake Up Ya Bish is built for people who want something bolder than a default alarm app.

Privacy Policy: https://eb28.co/alarmclock/privacy/
Terms of Use (EULA): https://www.apple.com/legal/internet-services/itunes/dev/stdeula/

## Keywords

alarm clock,wakeup,retro,productivity,timer,morning,habit,calendar

## What's New

- Added a native auto-renewable monthly subscription to remove sponsor panels
- Synced the latest web experience into the native iOS app
- Added native calendar-aware dashboard updates and iOS release polish

## Review Notes

- The app uses local notifications for alarm delivery.
- Calendar access is optional and only used to display the next upcoming event inside the app.
- No login is required.
- The app includes one auto-renewable monthly subscription: `Remove Ads` (`com.eb28.alarmclock.removeads.monthly`).
- The subscription removes sponsor panels from the dashboard and can be purchased or restored from the profile sheet in the iOS app.
- The subscription purchase card now includes functional links to the Privacy Policy and Terms of Use (Apple Standard EULA).
- Build 9 replaces the direct subscription purchase lookup on iPadOS 17+ with Apple's native `SubscriptionStoreView` sheet for `com.eb28.alarmclock.removeads.monthly`, so tapping `Remove Ads` opens the live App Store subscription card instead of failing when StoreKit product metadata is still warming up.
- Build 9 keeps a retry/backoff fallback around StoreKit product loading for status and restore checks while the App Store finishes syncing sandbox subscription metadata.
- Verified on April 3, 2026 on the same simulator family Apple cited (`iPad Air 11-inch (M3)`) that tapping `Remove Ads` opens the native subscription sheet labeled `Wake Up Ya Bish Premium`.
