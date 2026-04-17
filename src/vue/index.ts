import { inject, onScopeDispose } from "vue";
import type { App, InjectionKey } from "vue";
import { createHaptic, haptic as sharedHaptic } from "../core/haplib";
import type { Haptic, HapticOptions } from "../core/types";

export const HapticKey: InjectionKey<Haptic> = Symbol("tappt:haptic");

/**
 * Install a haptic instance on a Vue app. Components inside can access it
 * via `useHaptic()`. Without installing, `useHaptic()` falls back to the
 * shared singleton.
 */
export function tapptPlugin(options?: HapticOptions) {
  return {
    install(app: App) {
      const instance = createHaptic(options);
      app.provide(HapticKey, instance);
      const originalUnmount = app.unmount.bind(app);
      app.unmount = () => {
        instance.destroy();
        originalUnmount();
      };
    },
  };
}

/**
 * Access the provided haptic instance, falling back to the shared singleton.
 * If `scoped: true`, creates a fresh instance tied to the current effect
 * scope — destroyed automatically when the component unmounts.
 */
export function useHaptic(opts: { scoped?: boolean; options?: HapticOptions } = {}): Haptic {
  if (opts.scoped) {
    const instance = createHaptic(opts.options);
    onScopeDispose(() => instance.destroy());
    return instance;
  }
  return inject(HapticKey, sharedHaptic);
}

export type { Haptic, HapticOptions, HapticEvent, ImpactStyle, NotificationType, BackendName } from "../core/types";
