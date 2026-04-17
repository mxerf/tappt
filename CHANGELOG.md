# tappt

## 0.1.0

Initial release.

- Core API: `impact`, `notify`, `selection`, `trigger`, `createHaptic`.
- Backends with priority: Telegram WebApp → iOS 17.4+ switch hack → Vibration API → no-op.
- SSR-safe lazy detection, no UA sniffing.
- React adapter at `@mxerf/tappt/react` (`useHaptic`, `TapptProvider`).
- Vue 3 adapter at `@mxerf/tappt/vue` (`useHaptic`, `tapptPlugin`).
- Serialised pulse queue so overlapping `notify()` calls do not collide on iOS.
- `destroy()` for cleanup of the iOS DOM rig.
