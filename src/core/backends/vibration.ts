import type { Backend, ImpactStyle, NotificationType } from "../types";
import { hasNavigator } from "../env";

function vibrate(pattern: number | number[]): boolean {
  if (!hasNavigator() || typeof navigator.vibrate !== "function") return false;
  try {
    return navigator.vibrate(pattern);
  } catch {
    return false;
  }
}

function durationFor(style: ImpactStyle): number {
  switch (style) {
    case "heavy":
    case "rigid":
      return 25;
    case "medium":
      return 15;
    case "light":
    case "soft":
    default:
      return 8;
  }
}

export const vibrationBackend: Backend = {
  name: "vibration",
  isAvailable() {
    return hasNavigator() && typeof navigator.vibrate === "function";
  },
  impact(style: ImpactStyle) {
    vibrate(durationFor(style));
  },
  notify(type: NotificationType) {
    const pattern =
      type === "error"
        ? [10, 60, 10, 60, 10]
        : type === "warning"
          ? [10, 40, 10]
          : [12, 40, 12];
    vibrate(pattern);
  },
  selection() {
    vibrate(5);
  },
};
