import type {
  Backend,
  BackendName,
  Haptic,
  HapticEvent,
  HapticOptions,
  ImpactStyle,
  NotificationType,
} from "./types";
import { telegramBackend } from "./backends/telegram";
import { iosSwitchBackend } from "./backends/ios-switch";
import { vibrationBackend } from "./backends/vibration";
import { noopBackend } from "./backends/noop";

const REGISTRY: Record<BackendName, Backend> = {
  telegram: telegramBackend,
  "ios-switch": iosSwitchBackend,
  vibration: vibrationBackend,
  noop: noopBackend,
};

const PRIORITY: BackendName[] = ["telegram", "ios-switch", "vibration"];

function pickBackend(preferred?: BackendName): Backend {
  if (preferred) {
    const forced = REGISTRY[preferred];
    if (forced && forced.isAvailable()) return forced;
  }
  for (const name of PRIORITY) {
    const b = REGISTRY[name];
    if (b.isAvailable()) return b;
  }
  return noopBackend;
}

/**
 * Create a haptic controller. Backend resolution is lazy — the first call
 * to any method probes the environment and caches the result.
 */
export function createHaptic(options: HapticOptions = {}): Haptic {
  let resolved: Backend | null = null;
  let destroyed = false;
  const detachers = new Set<() => void>();

  const resolve = (): Backend => {
    if (destroyed || options.disabled) return noopBackend;
    if (!resolved) resolved = pickBackend(options.backend);
    return resolved;
  };

  const trigger = (event: HapticEvent): void => {
    const b = resolve();
    switch (event.kind) {
      case "impact":
        b.impact(event.style ?? "light");
        return;
      case "notification":
        b.notify(event.type ?? "success");
        return;
      case "selection":
        b.selection();
        return;
    }
  };

  return {
    impact(style: ImpactStyle = "light") {
      resolve().impact(style);
    },
    notify(type: NotificationType = "success") {
      resolve().notify(type);
    },
    selection() {
      resolve().selection();
    },
    trigger,
    attach(element: HTMLElement, event?: HapticEvent) {
      const backend = resolve();
      if (backend === noopBackend) return () => {};
      const unbind = backend.bind?.(element);
      const onClick = event ? () => trigger(event) : null;
      if (onClick) element.addEventListener("click", onClick);
      const detach = () => {
        if (!detachers.delete(detach)) return;
        unbind?.();
        if (onClick) element.removeEventListener("click", onClick);
      };
      detachers.add(detach);
      return detach;
    },
    getBackend() {
      return resolve().name;
    },
    isSupported() {
      return resolve().name !== "noop";
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      for (const detach of [...detachers]) detach();
      if (resolved?.destroy) resolved.destroy();
      resolved = null;
    },
  };
}

/**
 * Shared instance for simple apps. Import `haptic` and call methods on it —
 * no setup needed. Use `createHaptic()` if you need isolated instances
 * (e.g. per-test, or to override the backend).
 */
export const haptic: Haptic = createHaptic();

export function impact(style?: ImpactStyle): void {
  haptic.impact(style);
}

export function notify(type?: NotificationType): void {
  haptic.notify(type);
}

export function selection(): void {
  haptic.selection();
}

export function trigger(event: HapticEvent): void {
  haptic.trigger(event);
}

export function attach(element: HTMLElement, event?: HapticEvent): () => void {
  return haptic.attach(element, event);
}
