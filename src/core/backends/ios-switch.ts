import type { Backend, ImpactStyle, NotificationType } from "../types";
import { hasDocument } from "../env";

type IosRig = { input: HTMLInputElement; label: HTMLLabelElement };

function hasSwitchAttribute(): boolean {
  if (!hasDocument() || typeof HTMLInputElement === "undefined") return false;
  const proto = HTMLInputElement.prototype as unknown as Record<string, unknown>;
  return "switch" in proto;
}

function randomSuffix(): string {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = crypto.getRandomValues(new Uint8Array(8));
    return Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 10);
  }
  return Math.random().toString(36).slice(2, 12);
}

function createRig(): IosRig | null {
  try {
    const input = document.createElement("input");
    input.type = "checkbox";
    input.setAttribute("switch", "");
    input.id = `__haplib_switch_${randomSuffix()}__`;
    input.style.cssText =
      "position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;pointer-events:none;";
    input.setAttribute("aria-hidden", "true");
    input.setAttribute("tabindex", "-1");

    const label = document.createElement("label");
    label.htmlFor = input.id;
    label.style.cssText =
      "position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;pointer-events:none;";
    label.setAttribute("aria-hidden", "true");

    document.body.appendChild(input);
    document.body.appendChild(label);

    return { input, label };
  } catch {
    return null;
  }
}

function createIosSwitchBackend(): Backend {
  let rig: IosRig | null = null;
  let queue: Promise<void> = Promise.resolve();

  const ensureRig = (): IosRig | null => {
    if (!hasSwitchAttribute()) return null;
    if (rig && !rig.input.isConnected) rig = null;
    if (!rig) rig = createRig();
    return rig;
  };

  const pulse = (): boolean => {
    const r = ensureRig();
    if (!r) return false;
    try {
      r.label.click();
      return true;
    } catch {
      return false;
    }
  };

  const pulseRepeated = (count: number, gapMs = 55): void => {
    queue = queue.then(
      () =>
        new Promise<void>((resolve) => {
          let i = 0;
          const tick = () => {
            pulse();
            i++;
            if (i >= count) {
              resolve();
              return;
            }
            setTimeout(tick, gapMs);
          };
          tick();
        }),
    );
  };

  return {
    name: "ios-switch",
    isAvailable: hasSwitchAttribute,
    impact(_style: ImpactStyle) {
      pulse();
    },
    notify(type: NotificationType) {
      pulseRepeated(type === "error" ? 3 : 2);
    },
    selection() {
      pulse();
    },
    destroy() {
      if (rig) {
        rig.input.remove();
        rig.label.remove();
        rig = null;
      }
      queue = Promise.resolve();
    },
  };
}

export const iosSwitchBackend: Backend = createIosSwitchBackend();
