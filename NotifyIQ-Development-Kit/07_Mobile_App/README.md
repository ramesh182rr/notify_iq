# Mobile App Starter Notes

Create the current React Native Bare project using the official CLI guide. This folder supplies domain contracts and reference Kotlin code; it is not a complete generated RN project.

## Recommended JS dependencies to evaluate
- React Navigation for navigation.
- Zustand for lightweight UI state.
- TanStack Query only for network/server state.
- A maintained SQLite package with current React Native New Architecture support, or a Kotlin-owned repository exposed through a native module. Pick one authoritative DB path.
- React Native SVG only if needed for custom vector assets.

Do not add a notification-listener npm package until it passes the project compatibility checklist. The native listener itself must persist events even if JS is not running.
