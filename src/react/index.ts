import { createContext, createElement, useContext, useRef, useEffect } from "react";
import type { ReactNode } from "react";
import { createHaptic, haptic as sharedHaptic } from "../core/haplib";
import type { Haptic, HapticOptions } from "../core/types";

const HapticContext = createContext<Haptic | null>(null);

export interface TapptProviderProps {
  options?: HapticOptions;
  /** Provide an already-constructed haptic instance (e.g. from tests). */
  haptic?: Haptic;
  children?: ReactNode;
}

/**
 * Provides a haptic instance scoped to the subtree. Without it, `useHaptic`
 * falls back to the shared module-level instance.
 *
 * The instance lives in a ref with lazy init. We defer destroy() to a
 * microtask and cancel it on the next mount, so React 18+ strict-mode's
 * cleanup-then-remount pattern doesn't leave the Context pointing at a
 * destroyed instance.
 */
export function TapptProvider(props: TapptProviderProps) {
  const { options, haptic: injected, children } = props;
  const instanceRef = useRef<Haptic | null>(null);
  const destroyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!instanceRef.current) {
    instanceRef.current = injected ?? createHaptic(options);
  }

  useEffect(() => {
    if (destroyTimerRef.current !== null) {
      clearTimeout(destroyTimerRef.current);
      destroyTimerRef.current = null;
    }
    return () => {
      if (injected) return;
      destroyTimerRef.current = setTimeout(() => {
        if (instanceRef.current) {
          instanceRef.current.destroy();
          instanceRef.current = null;
        }
        destroyTimerRef.current = null;
      }, 0);
    };
  }, [injected]);

  return createElement(HapticContext.Provider, { value: instanceRef.current }, children);
}

/**
 * Access the nearest haptic instance, falling back to the shared singleton.
 * Stable across renders.
 */
export function useHaptic(): Haptic {
  const ctx = useContext(HapticContext);
  return ctx ?? sharedHaptic;
}

export type { Haptic, HapticOptions, HapticEvent, ImpactStyle, NotificationType, BackendName } from "../core/types";
