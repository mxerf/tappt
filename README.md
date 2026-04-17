# tappt

Tiny, SSR-safe haptic feedback for the web. Works in **Telegram Mini Apps**, **iOS Safari 17.4+** (via the Taptic Engine "switch" hack), and anywhere the **Vibration API** is available. Silent no-op on unsupported platforms.

- ~1.4 KB min+gzip core, zero runtime dependencies
- Lazy feature detection, no user-agent sniffing
- Built-in adapters for **React** and **Vue 3**
- TypeScript-first, ships ESM + CJS + `.d.ts`
- SSR-safe: importing on the server never touches `document`

## Why

Browsers give you fragmented options for haptic feedback:

1. **Telegram Mini Apps** expose `window.Telegram.WebApp.HapticFeedback` with a full `impact / notification / selection` API.
2. **iOS Safari 17.4+** gained the [`<input type="checkbox" switch>`](https://webkit.org/blog/15132/meet-safari-17-4/) element, which produces a real Taptic Engine pulse when toggled — the only way to trigger native haptics on iOS PWAs. There is no public API for this; `navigator.vibrate` is not implemented on iOS.
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
import { useHaptic, TapptProvider } from "@mxerf/tappt/react";

function LikeButton() {
  const haptic = useHaptic();
  return <button onClick={() => haptic.impact("medium")}>Like</button>;
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
import { useHaptic } from "@mxerf/tappt/vue";

const haptic = useHaptic();
</script>

<template>
  <button @click="haptic.impact('medium')">Like</button>
</template>
```

Install as a plugin to inject an app-wide instance:

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
| `getBackend()`                          | Returns which backend handled the last call (`noop` if nothing worked).   |
| `isSupported()`                         | `true` if any real backend is available.                                  |
| `destroy()`                             | Release the iOS rig and internal state. Subsequent calls are no-ops.      |

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

Every API is safe to import on the server. Backend detection is lazy and only runs when you actually call `impact() / notify() / selection() / trigger()` — so you can share a module-level `const haptic = createHaptic()` between client and server without guarding it.

## Browser support

- Telegram Mini Apps (iOS + Android)
- iOS Safari 17.4+ (PWA or in-browser)
- Chrome, Edge, Firefox, Samsung Internet (Android) — via Vibration API
- Everything else — silent no-op

## License

MIT
