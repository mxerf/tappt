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

  /** Which backend is active. Resolved lazily on first use. */
  getBackend(): BackendName;
  /** Whether any real backend is available (false means no-op). */
  isSupported(): boolean;
  /** Release DOM nodes and internal state. Safe to call multiple times. */
  destroy(): void;
}
