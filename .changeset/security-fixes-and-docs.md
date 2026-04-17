---
"@mxerf/tappt": patch
---

**Security & reliability fixes**

- iOS rig DOM id now uses `crypto.getRandomValues` with a 10-char suffix instead of `Math.random().toString(36).slice(2, 8)`. Prevents same-origin attackers from predicting the hidden input's id and hijacking the label binding. Fallback to `Math.random` only if `crypto` is unavailable (very old environments).

- `TapptProvider` (React) no longer loses its haptic instance in React 18+ StrictMode. Previously, StrictMode's cleanup→remount pattern destroyed the instance on the first cleanup and the `useMemo` was never re-invoked, leaving the context pointing at a destroyed no-op instance for the whole subtree. The fix switches from `useMemo` to `useRef` with lazy init and defers `destroy()` to a microtask so a remount can cancel it.

Plus: added a strict-mode regression test, a Russian `README.ru.md`, and an `examples/playground/` static demo ready for Dokploy (`tappt.mxerf.com`).
