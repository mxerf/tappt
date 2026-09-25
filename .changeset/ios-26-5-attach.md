---
"@mxerf/tappt": minor
---

**iOS 26.5+ support through `attach()`.** WebKit now delivers a programmatic `label.click()` to the switch as an untrusted click ([bug 309082](https://bugs.webkit.org/show_bug.cgi?id=309082)), so every haptic from 0.1.x is silent in Safari on iOS 26.5 and later. Only a finger on a real switch or label still fires the Taptic Engine.

- `haptic.attach(element, event?)` (and a top-level `attach()`) lays a transparent label wired to a hidden switch over the element. The first haptic requested inside a tap on it rides on that tap; a tap that requests nothing produces nothing. Pass `event` to fire it on every tap. Returns a detach function; `destroy()` detaches everything.
- React: `useHapticRef(event?)`. Vue: `v-haptic` (registered by `tapptPlugin`, or import `vHaptic` / `createHapticDirective`).
- Entry points now share one core chunk, so `haptic` from `@mxerf/tappt` and the React/Vue adapters are the same instance.
- Unchanged behaviour outside attached elements: Telegram, Android and iOS 17.4–26.4 work as before. On iOS 26.5+ `notify()` gives one pulse.
- The core grew from ~1.6 KB to ~2.4 KB min+gzip.
