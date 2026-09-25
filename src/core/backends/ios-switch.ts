import type { Backend, ImpactStyle, NotificationType } from "../types";
import { hasDocument } from "../env";

type IosRig = { input: HTMLInputElement; label: HTMLLabelElement };
type BoundHost = { refs: number; unmount: () => void };
type PendingTap = { claimed: boolean };

const PULSE_GAP_MS = 55;
const OVERLAY_ATTR = "data-tappt-overlay";

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

const stopPropagation = (event: Event) => event.stopPropagation();

function isStaticallyPositioned(element: HTMLElement): boolean {
  const position = getComputedStyle(element).position;
  return position === "" || position === "static";
}

function cloneClick(event: MouseEvent): MouseEvent {
  if (typeof PointerEvent !== "undefined" && event instanceof PointerEvent) {
    return new PointerEvent("click", event);
  }
  return new MouseEvent("click", event);
}

/**
 * Stretch a transparent label over `host`, wired to a hidden switch inside
 * it. A real tap on a label forwards a trusted click to its switch — the one
 * path iOS 26.5+ still honours for haptics, since programmatic clicks reach
 * the switch untrusted there. Returns a function that removes the overlay.
 */
function mountOverlay(host: HTMLElement, onTap: (event: MouseEvent) => void): () => void {
  const label = document.createElement("label");
  label.setAttribute(OVERLAY_ATTR, "");
  label.setAttribute("aria-hidden", "true");
  // `all: unset` shields the overlay from page-wide `label {}` rules.
  label.style.cssText =
    "all:unset;position:absolute;inset:0;border-radius:inherit;touch-action:manipulation;";

  const input = document.createElement("input");
  input.type = "checkbox";
  input.setAttribute("switch", "");
  // An empty `form` attribute keeps the switch out of an enclosing form.
  input.setAttribute("form", "");
  // Never under the finger: WebKit treats a touchstart on a switch as handled,
  // which would cancel a scroll that starts on the host.
  input.style.cssText = "position:absolute;width:1px;height:1px;margin:0;visibility:hidden;";
  for (const type of ["click", "input", "change"]) {
    input.addEventListener(type, stopPropagation);
  }

  label.addEventListener("click", (event) => {
    if (event.target === label) onTap(event);
  });
  // WebKit follows a label click with a DOMActivate that bubbles into the
  // host and would submit or activate it a second time, on top of the click
  // copy the host already received.
  label.addEventListener("DOMActivate", (event) => {
    event.preventDefault();
    event.stopPropagation();
  });
  label.appendChild(input);

  // React and Vue update a text-only element through `textContent`, which
  // drops every child, the overlay included: put it back.
  const keeper = new MutationObserver(() => {
    if (label.parentNode !== host) host.appendChild(label);
  });

  const previousPosition = host.style.position;
  let repositioned = false;
  let frame: number | null = null;
  const place = () => {
    // A detached host has no computed style to judge its positioning by, and
    // an overlay without a positioned host would cover the whole page: wait
    // until the host is in the document.
    if (!host.isConnected) {
      frame = requestAnimationFrame(place);
      return;
    }
    frame = null;
    if (isStaticallyPositioned(host)) {
      host.style.position = "relative";
      repositioned = true;
    }
    host.appendChild(label);
    keeper.observe(host, { childList: true });
  };
  place();

  return () => {
    if (frame !== null) cancelAnimationFrame(frame);
    keeper.disconnect();
    label.remove();
    if (repositioned) host.style.position = previousPosition;
  };
}

function createIosSwitchBackend(): Backend {
  let rig: IosRig | null = null;
  let queue: Promise<void> = Promise.resolve();
  const boundHosts = new WeakMap<HTMLElement, BoundHost>();
  // Set while an overlay dispatches its host click: the first haptic
  // requested during that dispatch rides on the tap's trusted switch click
  // instead of a programmatic pulse.
  let pendingTap: PendingTap | null = null;

  const claimTap = (): boolean => {
    if (!pendingTap || pendingTap.claimed) return false;
    pendingTap.claimed = true;
    return true;
  };

  const handleOverlayTap = (host: HTMLElement, event: MouseEvent): void => {
    // Host listeners get the copy dispatched below, never the label's click.
    event.stopPropagation();
    if (host.matches(":disabled")) {
      event.preventDefault();
      return;
    }
    const tap: PendingTap = { claimed: false };
    const outerTap = pendingTap;
    pendingTap = tap;
    try {
      host.dispatchEvent(cloneClick(event));
    } finally {
      pendingTap = outerTap;
    }
    // Nobody asked for a haptic: keep the label from toggling its switch.
    if (!tap.claimed) event.preventDefault();
  };

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

  const pulseRepeated = (count: number, startDelayMs = 0): void => {
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
            setTimeout(tick, PULSE_GAP_MS);
          };
          if (startDelayMs > 0) setTimeout(tick, startDelayMs);
          else tick();
        }),
    );
  };

  return {
    name: "ios-switch",
    isAvailable: hasSwitchAttribute,
    impact(_style: ImpactStyle) {
      if (!claimTap()) pulse();
    },
    notify(type: NotificationType) {
      const count = type === "error" ? 3 : 2;
      // A claimed tap delivers the first pulse; the rest stay programmatic,
      // which iOS 26.5+ silently drops.
      if (claimTap()) pulseRepeated(count - 1, PULSE_GAP_MS);
      else pulseRepeated(count);
    },
    selection() {
      if (!claimTap()) pulse();
    },
    bind(host: HTMLElement) {
      if (!hasSwitchAttribute()) return () => {};
      let entry = boundHosts.get(host);
      if (!entry) {
        entry = { refs: 0, unmount: mountOverlay(host, (event) => handleOverlayTap(host, event)) };
        boundHosts.set(host, entry);
      }
      const bound = entry;
      bound.refs++;
      let released = false;
      return () => {
        if (released) return;
        released = true;
        bound.refs--;
        if (bound.refs > 0) return;
        bound.unmount();
        boundHosts.delete(host);
      };
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
