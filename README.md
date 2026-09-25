# tappt

> [Читать на русском](./README.ru.md)

Tiny, SSR-safe haptic feedback for the web. Works in **Telegram Mini Apps**, **iOS Safari 17.4+** (via the Taptic Engine "switch" hack, iOS 26.5+ included through [`attach()`](#ios-265-attach-your-buttons)), and anywhere the **Vibration API** is available. Silent no-op on unsupported platforms.

- ~2.4 KB min+gzip core, zero runtime dependencies
- Lazy feature detection, no user-agent sniffing
- Built-in adapters for **React** and **Vue 3**
- TypeScript-first, ships ESM + CJS + `.d.ts`
- SSR-safe: importing on the server never touches `document`

## Why

Browsers give you fragmented options for haptic feedback:

1. **Telegram Mini Apps** expose `window.Telegram.WebApp.HapticFeedback` with a full `impact / notification / selection` API.
2. **iOS Safari 17.4+** gained the [`<input type="checkbox" switch>`](https://webkit.org/blog/15063/webkit-features-in-safari-17-4/) element, which produces a real Taptic Engine pulse when toggled — the only way to trigger native haptics on iOS PWAs. There is no public API for this; `navigator.vibrate` is not implemented on iOS. Since iOS 26.5 WebKit fires that pulse only for a real tap on the switch or its label ([bug 309082](https://bugs.webkit.org/show_bug.cgi?id=309082)), which is what [`attach()`](#ios-265-attach-your-buttons) is for.
3. **Android and other browsers** expose `navigator.vibrate(pattern)`.

`tappt` picks the best available backend at runtime and gives you a single, stable API.

## Install

```sh
bun add @mxerf/tappt
# or
npm i @mxerf/tappt
# or
pnpm add @mxerf/tappt
```

React and Vue are declared as **optional peer dependencies** — you only need them installed if you import `tappt/react` or `tappt/vue`.

## Usage

### Vanilla

```ts
import { haptic } from "@mxerf/tappt";

button.addEventListener("click", () => haptic.impact("medium"));
form.addEventListener("submit", () => haptic.notify("success"));
tabs.addEventListener("change", () => haptic.selection());
```

Or use the named functions directly:

```ts
import { impact, notify, selection } from "@mxerf/tappt";

impact("light");
notify("error");
selection();
```

### iOS 26.5+: attach your buttons

Since iOS 26.5, Safari fires the Taptic Engine only when a finger lands on a real switch. A haptic called from a click handler is silent there unless the element is **attached**:

```ts
import { haptic } from "@mxerf/tappt";

haptic.attach(button);
button.addEventListener("click", () => haptic.impact("medium"));
```

`attach()` lays a transparent `<label>` wired to a hidden switch over the element. The tap lands on the label, the element receives a copy of the click, and the first haptic requested inside that click rides on the tap. A click that requests nothing leaves the switch alone, so conditional haptics keep working:

```ts
haptic.attach(save);
save.addEventListener("click", () => {
  if (form.checkValidity()) haptic.notify("success");
});
```

To fire a haptic on every tap without a handler, pass the event. `attach()` returns a function that removes the overlay:

```ts
const detach = haptic.attach(tab, { kind: "selection" });
detach();
```

On other backends `attach()` without an event does nothing, and with an event it adds a plain click listener, so it is safe to call everywhere. Haptics outside attached elements behave as before: they still work in Telegram, on Android and on iOS 17.4–26.4.

### Discriminated event form

Useful when you want to pass the haptic intent through component props:

```ts
import { trigger, type HapticEvent } from "@mxerf/tappt";

function handleAction(event: HapticEvent) {
  trigger(event);
}

handleAction({ kind: "impact", style: "heavy" });
handleAction({ kind: "notification", type: "warning" });
handleAction({ kind: "selection" });
```

### Scoped instances

For tests, per-feature opt-outs, or forced backends:

```ts
import { createHaptic } from "@mxerf/tappt";

const haptic = createHaptic({
  backend: "vibration", // force a specific backend
  disabled: false,       // set true to make every call a no-op
});

haptic.impact();
haptic.destroy(); // releases the iOS rig and internal state
```

### React

```tsx
import { useHaptic, useHapticRef, TapptProvider } from "@mxerf/tappt/react";

function LikeButton() {
  const haptic = useHaptic();
  const ref = useHapticRef<HTMLButtonElement>(); // needed on iOS 26.5+
  return <button ref={ref} onClick={() => haptic.impact("medium")}>Like</button>;
}

// Or declaratively, without a handler
function NextButton() {
  return <button ref={useHapticRef({ kind: "selection" })}>Next</button>;
}

// Optional: scope a haptic instance to a subtree
export function App() {
  return (
    <TapptProvider options={{ disabled: userPrefersNoHaptics }}>
      <LikeButton />
    </TapptProvider>
  );
}
```

Without a provider, `useHaptic()` returns a shared module-level singleton — zero setup required.

### Vue 3

```vue
<script setup lang="ts">
import { useHaptic, vHaptic } from "@mxerf/tappt/vue";

const haptic = useHaptic();
</script>

<template>
  <!-- v-haptic is needed on iOS 26.5+ -->
  <button v-haptic @click="haptic.impact('medium')">Like</button>
  <!-- Or declaratively, without a handler -->
  <button v-haptic="{ kind: 'selection' }">Next</button>
</template>
```

Install as a plugin to inject an app-wide instance. The plugin also registers `v-haptic` globally, bound to that instance — use it without importing `vHaptic`:

```ts
import { createApp } from "vue";
import { tapptPlugin } from "@mxerf/tappt/vue";

createApp(App).use(tapptPlugin({ disabled: false })).mount("#app");
```

Or create a component-scoped instance that auto-destroys on unmount:

```ts
const haptic = useHaptic({ scoped: true, options: { backend: "vibration" } });
```

## API

### Types

```ts
type ImpactStyle = "light" | "medium" | "heavy" | "rigid" | "soft";
type NotificationType = "success" | "warning" | "error";
type BackendName = "telegram" | "ios-switch" | "vibration" | "noop";

type HapticEvent =
  | { kind: "impact"; style?: ImpactStyle }
  | { kind: "notification"; type?: NotificationType }
  | { kind: "selection" };
```

### Methods

| Method                                  | Description                                                               |
| --------------------------------------- | ------------------------------------------------------------------------- |
| `impact(style?)`                        | Short tap — buttons, toggles, drag endpoints.                             |
| `notify(type?)`                         | Event feedback — form success, errors, warnings.                          |
| `selection()`                           | Very light tap — tab switches, picker steps.                              |
| `trigger(event)`                        | Dispatch a discriminated `HapticEvent`.                                   |
| `attach(element, event?)`               | Let taps on the element carry haptics on iOS 26.5+. Returns a detach function. |
| `getBackend()`                          | Returns which backend handled the last call (`noop` if nothing worked).   |
| `isSupported()`                         | `true` if any real backend is available.                                  |
| `destroy()`                             | Release the iOS rig, attached elements and internal state. Subsequent calls are no-ops. |

### Options

```ts
createHaptic({
  backend: "telegram" | "ios-switch" | "vibration" | "noop",
  disabled: boolean,
});
```

## Backend priority

On first use, `tappt` picks the first available backend from this list:

1. **`telegram`** — `window.Telegram.WebApp.HapticFeedback`. Best quality inside Telegram clients.
2. **`ios-switch`** — hidden `<input type="checkbox" switch>` element. iOS 17.4+ Safari only.
3. **`vibration`** — `navigator.vibrate(pattern)`. Android and most desktop browsers.
4. **`noop`** — silent fallback (old iOS, locked-down browsers, SSR).

Pass `backend: "..."` to `createHaptic()` to force a specific one (e.g. skip Telegram even inside a Mini App).

## SSR

Every API is safe to import on the server. Backend detection is lazy and only runs when you actually call `impact() / notify() / selection() / trigger()` — so you can share a module-level `const haptic = createHaptic()` between client and server without guarding it. `attach()` takes a DOM element, so it only ever runs on the client — `useHapticRef` and `v-haptic` take care of that.

## Capability matrix

Not every backend supports every intensity. `tappt` always calls something, but what the user feels depends on the platform:

| Method              | Telegram Mini App | iOS Safari 17.4–26.4 (`ios-switch`) | iOS Safari 26.5+ (attached element) | Android / Vibration API | Noop |
| ------------------- | ----------------- | ----------------------------------- | ----------------------------------- | ----------------------- | ---- |
| `impact("light")`   | Distinct          | Single pulse (style ignored)        | Single pulse (style ignored)        | 8 ms vibrate            | —    |
| `impact("medium")`  | Distinct          | Single pulse (style ignored)        | Single pulse (style ignored)        | 15 ms vibrate           | —    |
| `impact("heavy")`   | Distinct          | Single pulse (style ignored)        | Single pulse (style ignored)        | 25 ms vibrate           | —    |
| `impact("rigid")`   | Distinct          | Single pulse (style ignored)        | Single pulse (style ignored)        | 25 ms vibrate           | —    |
| `impact("soft")`    | Distinct          | Single pulse (style ignored)        | Single pulse (style ignored)        | 8 ms vibrate            | —    |
| `notify("success")` | Distinct          | 2 pulses                            | 1 pulse                             | `[12, 40, 12]` pattern  | —    |
| `notify("warning")` | Distinct          | 2 pulses                            | 1 pulse                             | `[10, 40, 10]` pattern  | —    |
| `notify("error")`   | Distinct          | 3 pulses                            | 1 pulse                             | `[10, 60, 10, 60, 10]`  | —    |
| `selection()`       | Distinct          | Single pulse                        | Single pulse                        | 5 ms vibrate            | —    |

On iOS 26.5+ a haptic from an element that is not attached produces nothing.

## Known limitations

- **iOS Safari cannot differentiate `impact` styles.** The `<input type="checkbox" switch>` element gives you exactly one kind of Taptic pulse — there is no public iOS web API that exposes the full `UIImpactFeedbackGenerator` surface. `impact("light")` and `impact("heavy")` feel identical in Safari. Inside a Telegram Mini App on iOS they are distinct, because the TG client forwards the intent natively.
- **Android Vibration API varies wildly by device.** Some phones clip short vibrations below 10 ms, others ignore patterns entirely when battery saver is on. Don't encode meaning into small duration differences — design your UX so that *any* buzz means "something happened."
- **On iOS 26.5+ only the first haptic inside a tap on an attached element is felt.** Haptics after an `await`, from timers, or from elements that are not attached stay silent, and `notify()` shrinks to one pulse.
- **An attached element's click handlers receive a copy of the tap's click.** Its `isTrusted` is `false` and its `target` is the element itself. The default action — form submit, link navigation — still runs once.
- **The overlay covers the element's children.** Attach buttons and other leaf controls, not containers with interactive content inside. A statically positioned element gets `position: relative`, and children raised above the overlay with `z-index` take taps past it.
- **`notify()` on iOS Safari 17.4–26.4 is approximated by repeating pulses.** The timing gap is 55 ms. If you call `notify` twice in quick succession, they serialise through an internal queue so pulses don't interleave.
- **`navigator.vibrate` requires a user gesture** in most browsers. `tappt` doesn't try to work around this — call haptic methods from real click/touch handlers.

## Browser support

- Telegram Mini Apps (iOS + Android)
- iOS Safari 17.4+ (PWA or in-browser; 26.5+ needs `attach()`)
- Chrome, Edge, Firefox, Samsung Internet (Android) — via Vibration API
- Everything else — silent no-op

## License

MIT
