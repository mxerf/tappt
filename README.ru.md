# tappt

> [Read in English](./README.md)

Маленькая SSR-безопасная библиотека тактильной отдачи для веба. Работает в **Telegram Mini Apps**, **iOS Safari 17.4+** (через Taptic Engine и «switch»-хак) и везде, где доступен **Vibration API**. На неподдерживаемых платформах молча ничего не делает.

- ~1.4 КБ min+gzip в core, нулевые runtime-зависимости
- Ленивая feature-детекция, без user-agent sniffing
- Встроенные адаптеры для **React** и **Vue 3**
- TypeScript-first, поставляется в ESM + CJS + `.d.ts`
- SSR-безопасно: импорт на сервере не трогает `document`

## Зачем

Возможностей для тактильной отдачи в вебе немного, и они разрозненны:

1. **Telegram Mini Apps** предоставляют `window.Telegram.WebApp.HapticFeedback` с полноценным API `impact / notification / selection`.
2. **iOS Safari 17.4+** получил элемент [`<input type="checkbox" switch>`](https://webkit.org/blog/15063/webkit-features-in-safari-17-4/): при переключении он вызывает настоящий импульс Taptic Engine. Это единственный способ запустить нативную вибрацию в iOS-PWA — публичного API для этого нет, а `navigator.vibrate` на iOS не реализован.
3. **Android и остальные браузеры** предоставляют `navigator.vibrate(pattern)`.

При первом вызове `tappt` выбирает лучший доступный бэкенд и даёт единый стабильный API.

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

Удобно, когда нужно пробросить тип haptic-отклика через пропсы компонента:

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

Без `TapptProvider` хук `useHaptic()` возвращает общий синглтон на уровне модуля — никакой настройки не требуется.

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

Подключить плагином, чтобы зарегистрировать общий экземпляр на всё приложение:

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
| `impact(style?)`    | Короткий тап — кнопки, тумблеры, конец drag-жеста.                         |
| `notify(type?)`     | Отклик на событие — успех, предупреждение, ошибка в формах.                |
| `selection()`       | Очень лёгкий тап — переключение вкладок, шаги пикера.                      |
| `trigger(event)`    | Отправить discriminated-событие `HapticEvent`.                             |
| `getBackend()`      | Какой бэкенд сейчас активен (`noop`, если ничего не подошло).              |
| `isSupported()`     | `true`, если есть любой работающий бэкенд.                                 |
| `destroy()`         | Освободить DOM-элементы и внутреннее состояние. Последующие вызовы станут no-op. |

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
4. **`noop`** — тихий fallback (старые iOS, браузеры с ограничениями, SSR).

Передай `backend: "..."` в `createHaptic()`, чтобы выбрать конкретный бэкенд принудительно — например, пропустить Telegram даже внутри Mini App.

## SSR

Все API безопасно импортировать на сервере. Определение бэкенда откладывается до первого реального вызова `impact() / notify() / selection() / trigger()` — можно спокойно создавать `const haptic = createHaptic()` на уровне модуля и переиспользовать один и тот же экземпляр на клиенте и на сервере, без дополнительных проверок.

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

- **iOS Safari не различает стили `impact`.** Элемент `<input type="checkbox" switch>` даёт ровно один тип Taptic-импульса — публичного iOS Web API, который давал бы полный доступ к `UIImpactFeedbackGenerator`, не существует. `impact("light")` и `impact("heavy")` в Safari ощущаются одинаково. В Telegram Mini App на iOS они различаются: там клиент передаёт вызов в нативный слой.
- **Поведение Vibration API на Android сильно зависит от устройства.** Некоторые телефоны обрезают короткую вибрацию (меньше 10 мс), другие игнорируют паттерны в режиме энергосбережения. Не закладывай смысл в тонкие различия длительности — UX должен работать, даже если любой отклик означает просто «что-то произошло».
- **`notify()` на iOS Safari эмулируется серией пульсов** с паузой 55 мс. Вызовы, идущие подряд, ставятся в очередь и не накладываются друг на друга.
- **`navigator.vibrate` срабатывает только в ответ на действие пользователя** в большинстве браузеров. `tappt` не обходит это ограничение — вызывай haptic-методы из обработчиков click/touch.

## Поддержка браузеров

- Telegram Mini Apps (iOS + Android)
- iOS Safari 17.4+ (PWA или в браузере)
- Chrome, Edge, Firefox, Samsung Internet (Android) — через Vibration API
- Всё остальное — тихий no-op

## Лицензия

MIT
