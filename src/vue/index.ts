import { inject, onScopeDispose } from "vue";
import type { App, Directive, InjectionKey } from "vue";
import { hapticEventKey } from "../core/event-key";
import { createHaptic, haptic as sharedHaptic } from "../core/haplib";
import type { Haptic, HapticEvent, HapticOptions } from "../core/types";

export const HapticKey: InjectionKey<Haptic> = Symbol("tappt:haptic");

type Attachment = { key: string; detach: () => void };

/**
 * Build a `v-haptic` directive bound to `instance`: it attaches the element
 * (see `Haptic.attach`), which iOS Safari 26.5+ needs for haptics. The
 * optional value is a `HapticEvent` fired on every tap.
 */
export function createHapticDirective(instance: Haptic): Directive<HTMLElement, HapticEvent | undefined> {
  const attachments = new WeakMap<HTMLElement, Attachment>();

  const attach = (el: HTMLElement, event: HapticEvent | undefined) => {
    attachments.set(el, { key: hapticEventKey(event), detach: instance.attach(el, event) });
  };
  const detach = (el: HTMLElement) => {
    attachments.get(el)?.detach();
    attachments.delete(el);
  };

  return {
    mounted(el, binding) {
      attach(el, binding.value);
    },
    updated(el, binding) {
      // An inline object literal is a new value on every render: compare by
      // content so the element is re-attached only when the event changes.
      if (attachments.get(el)?.key === hapticEventKey(binding.value)) return;
      detach(el);
      attach(el, binding.value);
    },
    beforeUnmount(el) {
      detach(el);
    },
  };
}

/**
 * `v-haptic` on the shared instance. With `tapptPlugin` installed, use the
 * globally registered `v-haptic` instead — it follows the plugin's options.
 */
export const vHaptic = createHapticDirective(sharedHaptic);

/**
 * Install a haptic instance on a Vue app. Components inside can access it
 * via `useHaptic()` and `v-haptic`. Without installing, `useHaptic()` falls
 * back to the shared singleton.
 */
export function tapptPlugin(options?: HapticOptions) {
  return {
    install(app: App) {
      const instance = createHaptic(options);
      app.provide(HapticKey, instance);
      app.directive("haptic", createHapticDirective(instance));
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
