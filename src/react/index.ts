import { createContext, createElement, useContext, useMemo, useRef, useEffect } from "react";
import type { ReactNode } from "react";
import { createHaptic, haptic as sharedHaptic } from "../core/haplib";
import type { Haptic, HapticOptions } from "../core/types";

const HapticContext = createContext<Haptic | null>(null);

export interface HaplibProviderProps {
  options?: HapticOptions;
  /** Provide an already-constructed haptic instance (e.g. from tests). */
  haptic?: Haptic;
  children?: ReactNode;
}

/**
 * Provides a haptic instance scoped to the subtree. Without it, `useHaptic`
 * falls back to the shared module-level instance.
 */
export function HaplibProvider(props: HaplibProviderProps) {
  const { options, haptic: injected, children } = props;
  const ownedRef = useRef<Haptic | null>(null);

  const instance = useMemo<Haptic>(() => {
    if (injected) return injected;
    if (!ownedRef.current) ownedRef.current = createHaptic(options);
    return ownedRef.current;
  }, [injected, options]);

  useEffect(() => {
    return () => {
      if (ownedRef.current && !injected) {
        ownedRef.current.destroy();
        ownedRef.current = null;
      }
    };
  }, [injected]);

  return createElement(HapticContext.Provider, { value: instance }, children);
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
