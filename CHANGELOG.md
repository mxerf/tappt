# tappt

## 0.1.3

### Patch Changes

- f60a8a3: Documentation: added a capability matrix (what each backend actually delivers per method) and a "Known limitations" section to both the English and Russian README. Notably clarifies that **iOS Safari cannot differentiate impact styles** — all five `impact()` values produce the same Taptic pulse because the `<input type="checkbox" switch>` element exposes only one haptic kind. No behaviour change.

## 0.1.2

### Patch Changes

- b4e11dc: **Security & reliability fixes**

  - iOS rig DOM id now uses `crypto.getRandomValues` with a 10-char suffix instead of `Math.random().toString(36).slice(2, 8)`. Prevents same-origin attackers from predicting the hidden input's id and hijacking the label binding. Fallback to `Math.random` only if `crypto` is unavailable (very old environments).

  - `TapptProvider` (React) no longer loses its haptic instance in React 18+ StrictMode. Previously, StrictMode's cleanup→remount pattern destroyed the instance on the first cleanup and the `useMemo` was never re-invoked, leaving the context pointing at a destroyed no-op instance for the whole subtree. The fix switches from `useMemo` to `useRef` with lazy init and defers `destroy()` to a microtask so a remount can cancel it.

  - Telegram backend is no longer selected when a page merely loads `telegram-web-app.js` outside of a real Mini App. The official SDK attaches a `window.Telegram.WebApp` stub on any website that embeds the script — its `HapticFeedback` methods exist but do nothing. We now require `initData` to be non-empty **or** `platform` to match a known real client (`ios`/`android`/`macos`/`tdesktop`/`weba`/`webk`) before trusting the bridge. Prevents silent "backend=telegram, no feedback" failures.

  Plus: added a strict-mode regression test, a Russian `README.ru.md`, and an `examples/playground/` static demo ready for Dokploy (`tappt.mxerf.com`).

## 0.1.1

### Patch Changes

- 5525e51: First release published through GitHub Actions with OIDC provenance. No runtime code changes since 0.1.0 — this version exists so downstream consumers can verify the npm package against a signed provenance attestation.

## 0.1.0

Initial release.

- Core API: `impact`, `notify`, `selection`, `trigger`, `createHaptic`.
- Backends with priority: Telegram WebApp → iOS 17.4+ switch hack → Vibration API → no-op.
- SSR-safe lazy detection, no UA sniffing.
- React adapter at `@mxerf/tappt/react` (`useHaptic`, `TapptProvider`).
- Vue 3 adapter at `@mxerf/tappt/vue` (`useHaptic`, `tapptPlugin`).
- Serialised pulse queue so overlapping `notify()` calls do not collide on iOS.
- `destroy()` for cleanup of the iOS DOM rig.
