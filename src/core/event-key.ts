import type { HapticEvent } from "./types";

/**
 * Identity of a haptic event by value, so adapters can tell a new event from
 * the same object literal re-created on every render.
 */
export function hapticEventKey(event: HapticEvent | undefined): string {
  if (!event) return "";
  switch (event.kind) {
    case "impact":
      return `impact:${event.style ?? ""}`;
    case "notification":
      return `notification:${event.type ?? ""}`;
    case "selection":
      return "selection";
  }
}
