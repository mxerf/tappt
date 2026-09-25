export type ImpactStyle = "light" | "medium" | "heavy" | "rigid" | "soft";
export type NotificationType = "success" | "warning" | "error";

export type HapticEvent =
  | { kind: "impact"; style?: ImpactStyle }
  | { kind: "notification"; type?: NotificationType }
  | { kind: "selection" };

export type BackendName = "telegram" | "ios-switch" | "vibration" | "noop";

export interface Backend {
  readonly name: BackendName;
  isAvailable(): boolean;
  impact(style: ImpactStyle): void;
  notify(type: NotificationType): void;
  selection(): void;
  /**
   * Prepare `element` so that a real tap on it can carry a haptic. Haptic
   * calls made while that tap's click is dispatched on the element ride on
   * it. Returns a function that undoes the preparation.
   */
  bind?(element: HTMLElement): () => void;
  destroy?(): void;
}

export interface HapticOptions {
  /**
   * Force a specific backend. Useful for testing or to opt out of the
   * Telegram backend when you prefer native Vibration behaviour.
   */
  backend?: BackendName;
  /**
   * Disable haptics entirely (e.g. user preference). When true, every call
   * is a silent no-op.
   */
  disabled?: boolean;
}

export interface Haptic {
  impact(style?: ImpactStyle): void;
  notify(type?: NotificationType): void;
  selection(): void;
  trigger(event: HapticEvent): void;
  /**
   * Make taps on `element` able to produce haptics everywhere, including iOS
   * Safari 26.5+, where only a finger on a real switch fires the Taptic
   * Engine. Haptic calls made in the element's click handlers ride on the
   * tap; pass `event` to fire it on every tap without writing a handler.
   * Returns a function that detaches the element.
   */
  attach(element: HTMLElement, event?: HapticEvent): () => void;

  /** Which backend is active. Resolved lazily on first use. */
  getBackend(): BackendName;
  /** Whether any real backend is available (false means no-op). */
  isSupported(): boolean;
  /**
   * Release DOM nodes, attached elements and internal state. Safe to call
   * multiple times.
   */
  destroy(): void;
}
