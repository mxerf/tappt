# tappt

> [Read in English](./README.md)

Маленькая SSR-безопасная библиотека для тактильной отдачи в вебе. Работает в **Telegram Mini Apps**, **iOS Safari 17.4+** (через Taptic Engine и «switch»-хак) и везде, где доступен **Vibration API**. На неподдерживаемых платформах тихо выключается.

- ~1.4 КБ min+gzip в core, нулевые runtime-зависимости
- Ленивая feature-детекция, без user-agent sniffing
- Встроенные адаптеры для **React** и **Vue 3**
- TypeScript-first, поставляется в ESM + CJS + `.d.ts`
- SSR-безопасно: импорт на сервере не трогает `document`

## Зачем

В браузерах тактильная отдача фрагментирована:

1. **Telegram Mini Apps** дают `window.Telegram.WebApp.HapticFeedback` с полноценным API `impact / notification / selection`.
2. **iOS Safari 17.4+** получил элемент [`<input type="checkbox" switch>`](https://webkit.org/blog/15063/webkit-features-in-safari-17-4/), который при переключении даёт настоящий импульс Taptic Engine — единственный способ вызвать нативную отдачу в iOS-PWA. Публичного API для этого нет; `navigator.vibrate` на iOS не реализован.
3. **Android и остальные браузеры** экспонируют `navigator.vibrate(pattern)`.

`tappt` при первом вызове выбирает лучший доступный бэкенд и даёт единый стабильный API.

## Установка

```sh
bun add @mxerf/tappt
# или
npm i @mxerf/tappt
# или
pnpm add @mxerf/tappt
```

React и Vue объявлены как **опциональные peer-зависимости** — они нужны только если ты импортируешь `@mxerf/tappt/react` или `@mxerf/tappt/vue`.

## Использование

### Vanilla

```ts
import { haptic } from "@mxerf/tappt";

button.addEventListener("click", () => haptic.impact("medium"));
form.addEventListener("submit", () => haptic.notify("success"));
tabs.addEventListener("change", () => haptic.selection());
```

Либо именованные функции напрямую:

```ts
import { impact, notify, selection } from "@mxerf/tappt";

impact("light");
notify("error");
selection();
```

### Discriminated-событие

Удобно, когда нужно прокинуть haptic-намерение через пропсы компонента:

```ts
import { trigger, type HapticEvent } from "@mxerf/tappt";

function handleAction(event: HapticEvent) {
  trigger(event);
}

handleAction({ kind: "impact", style: "heavy" });
handleAction({ kind: "notification", type: "warning" });
handleAction({ kind: "selection" });
```

### Scoped-инстансы

Для тестов, локальных opt-out или принудительного выбора бэкенда:

```ts
import { createHaptic } from "@mxerf/tappt";

const haptic = createHaptic({
  backend: "vibration", // форсировать бэкенд
  disabled: false,       // true → все вызовы становятся no-op
});

haptic.impact();
haptic.destroy(); // освобождает iOS-rig и внутреннее состояние
```

### React

```tsx
import { useHaptic, TapptProvider } from "@mxerf/tappt/react";

function LikeButton() {
  const haptic = useHaptic();
  return <button onClick={() => haptic.impact("medium")}>Лайк</button>;
}

// По желанию: отдельный инстанс для поддерева
export function App() {
  return (
    <TapptProvider options={{ disabled: userPrefersNoHaptics }}>
      <LikeButton />
    </TapptProvider>
  );
}
```

Без `TapptProvider` хук `useHaptic()` возвращает общий модульный singleton — никакой настройки не требуется.

### Vue 3

```vue
<script setup lang="ts">
import { useHaptic } from "@mxerf/tappt/vue";

const haptic = useHaptic();
</script>

<template>
  <button @click="haptic.impact('medium')">Лайк</button>
</template>
```

Подключить плагином, чтобы инжектнуть общий инстанс на всё приложение:

```ts
import { createApp } from "vue";
import { tapptPlugin } from "@mxerf/tappt/vue";

createApp(App).use(tapptPlugin({ disabled: false })).mount("#app");
```

Или создать инстанс, привязанный к компоненту — он автоматически уничтожится на unmount:

```ts
const haptic = useHaptic({ scoped: true, options: { backend: "vibration" } });
```

## API

### Типы

```ts
type ImpactStyle = "light" | "medium" | "heavy" | "rigid" | "soft";
type NotificationType = "success" | "warning" | "error";
type BackendName = "telegram" | "ios-switch" | "vibration" | "noop";

type HapticEvent =
  | { kind: "impact"; style?: ImpactStyle }
  | { kind: "notification"; type?: NotificationType }
  | { kind: "selection" };
```

### Методы

| Метод               | Описание                                                                   |
| ------------------- | -------------------------------------------------------------------------- |
| `impact(style?)`    | Короткий тап — кнопки, тумблеры, концы drag-жестов.                        |
| `notify(type?)`     | Событийная отдача — успех/ошибка/предупреждение в формах.                  |
| `selection()`       | Очень лёгкий тап — переключение вкладок, шаги пикера.                      |
| `trigger(event)`    | Отправить discriminated-событие `HapticEvent`.                             |
| `getBackend()`      | Какой бэкенд сейчас активен (`noop`, если ничего не подошло).              |
| `isSupported()`     | `true`, если есть любой работающий бэкенд.                                 |
| `destroy()`         | Очистить iOS-rig и внутреннее состояние. Последующие вызовы станут no-op. |

### Опции

```ts
createHaptic({
  backend: "telegram" | "ios-switch" | "vibration" | "noop",
  disabled: boolean,
});
```

## Приоритет бэкендов

При первом вызове `tappt` берёт первый доступный из списка:

1. **`telegram`** — `window.Telegram.WebApp.HapticFeedback`. Лучшее качество внутри Telegram-клиентов.
2. **`ios-switch`** — скрытый `<input type="checkbox" switch>`. Только iOS Safari 17.4+.
3. **`vibration`** — `navigator.vibrate(pattern)`. Android и большинство десктопных браузеров.
4. **`noop`** — тихий fallback (старые iOS, изолированные браузеры, SSR).

Передай `backend: "..."` в `createHaptic()`, чтобы форсировать конкретный — например, пропустить Telegram-бэкенд даже внутри Mini App.

## SSR

Все API безопасны для импорта на сервере. Детекция бэкенда ленивая и срабатывает только при реальном вызове `impact() / notify() / selection() / trigger()` — можно спокойно создавать `const haptic = createHaptic()` на уровне модуля и шарить между клиентом и сервером без guard-ов.

## Матрица возможностей

Не каждый бэкенд умеет всё. `tappt` всегда что-то вызывает, но что именно почувствует пользователь — зависит от платформы:

| Метод                | Telegram Mini App | iOS Safari 17.4+ (`ios-switch`) | Android / Vibration API      | Noop |
| -------------------- | ----------------- | ------------------------------- | ---------------------------- | ---- |
| `impact("light")`    | Различимо         | Один пульс (стиль игнорируется) | 8 мс вибрации                | —    |
| `impact("medium")`   | Различимо         | Один пульс (стиль игнорируется) | 15 мс вибрации               | —    |
| `impact("heavy")`    | Различимо         | Один пульс (стиль игнорируется) | 25 мс вибрации               | —    |
| `impact("rigid")`    | Различимо         | Один пульс (стиль игнорируется) | 25 мс вибрации               | —    |
| `impact("soft")`     | Различимо         | Один пульс (стиль игнорируется) | 8 мс вибрации                | —    |
| `notify("success")`  | Различимо         | 2 пульса                        | паттерн `[12, 40, 12]`       | —    |
| `notify("warning")`  | Различимо         | 2 пульса                        | паттерн `[10, 40, 10]`       | —    |
| `notify("error")`    | Различимо         | 3 пульса                        | `[10, 60, 10, 60, 10]`       | —    |
| `selection()`        | Различимо         | Один пульс                      | 5 мс вибрации                | —    |

## Известные ограничения

- **iOS Safari не различает стили `impact`.** Элемент `<input type="checkbox" switch>` даёт ровно один тип Taptic-импульса — публичного iOS Web API, который давал бы полный доступ к `UIImpactFeedbackGenerator`, не существует. `impact("light")` и `impact("heavy")` в Safari ощущаются одинаково. Внутри Telegram Mini App на iOS они различаются — TG-клиент пробрасывает намерение в нативный слой.
- **Android Vibration API сильно зависит от устройства.** Некоторые телефоны обрезают короткую вибрацию (<10 мс), другие игнорируют паттерны в режиме энергосбережения. Не закладывай смысл в маленькие отличия длительности — UX должен работать если *любой* buzz значит «что-то произошло».
- **`notify()` на iOS Safari эмулируется повторяющимися пульсами**, с паузой 55 мс. Если `notify` вызвать дважды подряд, вызовы сериализуются во внутренней очереди — пульсы не накладываются.
- **`navigator.vibrate` требует user gesture** в большинстве браузеров. `tappt` не обходит это ограничение — вызывай haptic-методы из реальных click/touch обработчиков.

## Поддержка браузеров

- Telegram Mini Apps (iOS + Android)
- iOS Safari 17.4+ (PWA или в браузере)
- Chrome, Edge, Firefox, Samsung Internet (Android) — через Vibration API
- Всё остальное — тихий no-op

## Лицензия

MIT
