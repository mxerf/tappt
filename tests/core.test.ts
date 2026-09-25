import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createHaptic } from "../src/core/haplib";
import {
  clearTelegram,
  clearIosSwitch,
  clearVibrate,
  mockTelegramWebApp,
  mockTelegramStub,
  mockIosSwitch,
  mockVibrate,
  resetHapticState,
} from "./helpers";

beforeEach(() => resetHapticState());
afterEach(() => resetHapticState());

describe("backend selection", () => {
  it("prefers telegram when available", () => {
    const tg = mockTelegramWebApp();
    mockIosSwitch();
    mockVibrate();
    const h = createHaptic();
    h.impact("medium");
    expect(h.getBackend()).toBe("telegram");
    expect(tg.impact).toHaveBeenCalledWith("medium");
  });

  it("falls back to ios-switch when telegram absent", () => {
    clearTelegram();
    mockIosSwitch();
    mockVibrate();
    const h = createHaptic();
    h.impact();
    expect(h.getBackend()).toBe("ios-switch");
  });

  it("falls back to vibration when iOS switch unsupported", () => {
    clearTelegram();
    clearIosSwitch();
    const vib = mockVibrate();
    const h = createHaptic();
    h.impact("heavy");
    expect(h.getBackend()).toBe("vibration");
    expect(vib).toHaveBeenCalledWith(25);
  });

  it("no-op when nothing is supported", () => {
    clearTelegram();
    clearIosSwitch();
    clearVibrate();
    const h = createHaptic();
    h.impact();
    h.notify();
    h.selection();
    expect(h.getBackend()).toBe("noop");
    expect(h.isSupported()).toBe(false);
  });

  it("respects forced backend option", () => {
    mockTelegramWebApp();
    const vib = mockVibrate();
    const h = createHaptic({ backend: "vibration" });
    h.impact();
    expect(h.getBackend()).toBe("vibration");
    expect(vib).toHaveBeenCalled();
  });

  it("disabled option makes every call a no-op", () => {
    const tg = mockTelegramWebApp();
    const h = createHaptic({ disabled: true });
    h.impact();
    h.notify();
    h.selection();
    expect(tg.impact).not.toHaveBeenCalled();
    expect(tg.notify).not.toHaveBeenCalled();
    expect(tg.selection).not.toHaveBeenCalled();
  });
});

describe("telegram backend", () => {
  it("forwards notify/selection correctly", () => {
    const tg = mockTelegramWebApp();
    const h = createHaptic();
    h.notify("error");
    h.selection();
    expect(tg.notify).toHaveBeenCalledWith("error");
    expect(tg.selection).toHaveBeenCalled();
  });

  it("swallows errors thrown by the TG client", () => {
    const tg = mockTelegramWebApp();
    tg.impact.mockImplementation(() => {
      throw new Error("old client");
    });
    const h = createHaptic();
    expect(() => h.impact()).not.toThrow();
  });

  it("ignores the public telegram-web-app.js stub (no real Mini App)", () => {
    // A plain website that loads telegram-web-app.js gets a window.Telegram
    // with empty initData and platform=unknown. We must NOT pick the telegram
    // backend in that case.
    mockTelegramStub();
    clearIosSwitch();
    const vib = mockVibrate();
    const h = createHaptic();
    h.impact("medium");
    expect(h.getBackend()).toBe("vibration");
    expect(vib).toHaveBeenCalled();
  });
});

describe("ios switch backend", () => {
  it("creates a hidden rig and clicks the label on impact", () => {
    clearTelegram();
    mockIosSwitch();
    const h = createHaptic();
    h.impact();
    const label = document.querySelector("label");
    expect(label).not.toBeNull();
    const input = document.querySelector("input[type=checkbox][switch]");
    expect(input).not.toBeNull();
  });

  it("serialises repeated pulses so notify() calls do not overlap", async () => {
    clearTelegram();
    mockIosSwitch();
    vi.useFakeTimers();
    const h = createHaptic();
    const clickSpy = vi.spyOn(HTMLLabelElement.prototype, "click");
    h.notify("error");
    h.notify("success");
    await vi.runAllTimersAsync();
    expect(clickSpy.mock.calls.length).toBe(5);
    vi.useRealTimers();
  });

  it("destroy() removes DOM nodes", () => {
    clearTelegram();
    mockIosSwitch();
    const h = createHaptic();
    h.impact();
    expect(document.querySelector("label")).not.toBeNull();
    h.destroy();
    expect(document.querySelectorAll("label").length).toBe(0);
    expect(document.querySelectorAll("input[switch]").length).toBe(0);
  });
});

describe("attach() on ios-switch", () => {
  const overlayOf = (host: HTMLElement): HTMLLabelElement | null => {
    const child = [...host.children].find((el) => el.hasAttribute("data-tappt-overlay"));
    return child instanceof HTMLLabelElement ? child : null;
  };
  const switchOf = (host: HTMLElement) =>
    overlayOf(host)?.querySelector<HTMLInputElement>("input[type=checkbox][switch]") ?? null;

  /** Tap the overlay like a finger would and return the label's click event. */
  function tap(host: HTMLElement): MouseEvent {
    const label = overlayOf(host);
    if (!label) throw new Error("host has no overlay");
    const seen: MouseEvent[] = [];
    const capture = (e: Event) => {
      if (e.target === label && e instanceof MouseEvent) seen.push(e);
    };
    window.addEventListener("click", capture, true);
    label.click();
    window.removeEventListener("click", capture, true);
    const [event] = seen;
    if (!event) throw new Error("label click was not dispatched");
    return event;
  }

  const rigCounters: Array<(e: Event) => void> = [];

  /** Count programmatic pulses on tappt's hidden rig. */
  function countRigPulses(): () => number {
    let pulses = 0;
    const counter = (e: Event) => {
      const t = e.target;
      if (t instanceof HTMLLabelElement && t.htmlFor.startsWith("__haplib_switch_")) pulses++;
    };
    window.addEventListener("click", counter, true);
    rigCounters.push(counter);
    return () => pulses;
  }

  function mountHost(): HTMLButtonElement {
    const host = document.createElement("button");
    host.textContent = "Tap";
    document.body.appendChild(host);
    return host;
  }

  beforeEach(() => {
    clearTelegram();
    mockIosSwitch();
  });

  afterEach(() => {
    for (const counter of rigCounters.splice(0)) {
      window.removeEventListener("click", counter, true);
    }
  });

  it("overlays the element with a label wired to a hidden switch", () => {
    const host = mountHost();
    const detach = createHaptic().attach(host);
    const label = overlayOf(host);
    const sw = switchOf(host);
    expect(label?.getAttribute("aria-hidden")).toBe("true");
    expect(sw?.style.visibility).toBe("hidden");
    expect(sw?.getAttribute("form")).toBe("");
    expect(host.style.position).toBe("relative");

    detach();
    expect(overlayOf(host)).toBeNull();
    expect(host.style.position).toBe("");
  });

  it("waits for a detached element to enter the document before overlaying it", async () => {
    const host = document.createElement("button");
    const detach = createHaptic().attach(host);
    expect(overlayOf(host)).toBeNull();
    expect(host.style.position).toBe("");

    document.body.appendChild(host);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(overlayOf(host)).not.toBeNull();
    expect(host.style.position).toBe("relative");

    detach();
    expect(overlayOf(host)).toBeNull();
  });

  it("stops waiting once a detached element is released", async () => {
    const host = document.createElement("button");
    createHaptic().attach(host)();
    document.body.appendChild(host);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(overlayOf(host)).toBeNull();
  });

  it("leaves an explicitly positioned host alone", () => {
    const host = mountHost();
    host.style.position = "absolute";
    const detach = createHaptic().attach(host);
    expect(host.style.position).toBe("absolute");
    detach();
    expect(host.style.position).toBe("absolute");
  });

  it("hands the host exactly one click and none of the switch's events", () => {
    const host = mountHost();
    const h = createHaptic();
    h.attach(host);
    const clicks = vi.fn((e: Event) => {
      expect(e.target).toBe(host);
      h.impact();
    });
    const changes = vi.fn();
    host.addEventListener("click", clicks);
    host.addEventListener("input", changes);
    host.addEventListener("change", changes);

    tap(host);

    expect(clicks).toHaveBeenCalledTimes(1);
    expect(changes).not.toHaveBeenCalled();
    expect(switchOf(host)?.checked).toBe(true);
  });

  it("keeps the label's DOMActivate from activating the host a second time", () => {
    const host = mountHost();
    createHaptic().attach(host);
    const activations = vi.fn();
    host.addEventListener("DOMActivate", activations);

    const activate = new UIEvent("DOMActivate", { bubbles: true, cancelable: true });
    overlayOf(host)?.dispatchEvent(activate);

    expect(activate.defaultPrevented).toBe(true);
    expect(activations).not.toHaveBeenCalled();
  });

  it("a haptic call inside the tap rides on it instead of a programmatic pulse", () => {
    const host = mountHost();
    const h = createHaptic();
    h.attach(host);
    host.addEventListener("click", () => h.impact("medium"));
    const rigPulses = countRigPulses();

    const event = tap(host);

    expect(event.defaultPrevented).toBe(false);
    expect(switchOf(host)?.checked).toBe(true);
    expect(rigPulses()).toBe(0);
  });

  it("a tap without a haptic call leaves the switch alone", () => {
    const host = mountHost();
    createHaptic().attach(host);

    const event = tap(host);

    expect(event.defaultPrevented).toBe(true);
    expect(switchOf(host)?.checked).toBe(false);
  });

  it("a handler's preventDefault cannot swallow the haptic", () => {
    const host = mountHost();
    const h = createHaptic();
    h.attach(host);
    host.addEventListener("click", (e) => {
      e.preventDefault();
      h.selection();
    });

    const event = tap(host);

    expect(event.defaultPrevented).toBe(false);
    expect(switchOf(host)?.checked).toBe(true);
  });

  it("notify() inside a tap claims the first pulse and schedules the rest", async () => {
    vi.useFakeTimers();
    const host = mountHost();
    const h = createHaptic();
    h.attach(host);
    host.addEventListener("click", () => h.notify("error"));
    const rigPulses = countRigPulses();

    tap(host);
    expect(rigPulses()).toBe(0);
    await vi.runAllTimersAsync();
    expect(rigPulses()).toBe(2);
    vi.useRealTimers();
  });

  it("fires a declared event on every tap", () => {
    const host = mountHost();
    createHaptic().attach(host, { kind: "impact", style: "heavy" });
    const rigPulses = countRigPulses();

    expect(tap(host).defaultPrevented).toBe(false);
    expect(tap(host).defaultPrevented).toBe(false);
    expect(rigPulses()).toBe(0);
  });

  it("ignores taps on a disabled host", () => {
    const host = mountHost();
    createHaptic().attach(host, { kind: "selection" });
    host.disabled = true;
    const clicks = vi.fn();
    host.addEventListener("click", clicks);

    const event = tap(host);

    expect(clicks).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
  });

  it("keeps one overlay per element until every attachment is released", () => {
    const host = mountHost();
    const h = createHaptic();
    const first = h.attach(host);
    const second = h.attach(host);
    expect(host.querySelectorAll("label[data-tappt-overlay]").length).toBe(1);

    first();
    first();
    expect(overlayOf(host)).not.toBeNull();
    second();
    expect(overlayOf(host)).toBeNull();
  });

  it("destroy() detaches every attached element", () => {
    const a = mountHost();
    const b = mountHost();
    const h = createHaptic();
    h.attach(a);
    h.attach(b, { kind: "selection" });

    h.destroy();

    expect(overlayOf(a)).toBeNull();
    expect(overlayOf(b)).toBeNull();
  });

  it("is a no-op when haptics are disabled", () => {
    const host = mountHost();
    const detach = createHaptic({ disabled: true }).attach(host);
    expect(overlayOf(host)).toBeNull();
    expect(() => detach()).not.toThrow();
  });
});

describe("attach() on other backends", () => {
  it("fires a declared event from a plain click listener", () => {
    const tg = mockTelegramWebApp();
    const host = document.createElement("button");
    document.body.appendChild(host);
    const detach = createHaptic().attach(host, { kind: "impact", style: "heavy" });
    expect(host.querySelector("label")).toBeNull();

    host.click();
    expect(tg.impact).toHaveBeenCalledWith("heavy");

    detach();
    host.click();
    expect(tg.impact).toHaveBeenCalledTimes(1);
  });

  it("adds nothing without a declared event", () => {
    const tg = mockTelegramWebApp();
    const host = document.createElement("button");
    document.body.appendChild(host);
    createHaptic().attach(host);

    host.click();
    expect(host.childElementCount).toBe(0);
    expect(tg.impact).not.toHaveBeenCalled();
  });
});

describe("vibration backend", () => {
  it("maps impact styles to durations", () => {
    clearTelegram();
    clearIosSwitch();
    const vib = mockVibrate();
    const h = createHaptic();
    h.impact("light");
    h.impact("medium");
    h.impact("heavy");
    h.impact("rigid");
    h.impact("soft");
    expect(vib.mock.calls).toEqual([[8], [15], [25], [25], [8]]);
  });

  it("notify uses distinct patterns", () => {
    clearTelegram();
    clearIosSwitch();
    const vib = mockVibrate();
    const h = createHaptic();
    h.notify("success");
    h.notify("warning");
    h.notify("error");
    expect(vib.mock.calls).toEqual([
      [[12, 40, 12]],
      [[10, 40, 10]],
      [[10, 60, 10, 60, 10]],
    ]);
  });
});

describe("trigger() dispatch", () => {
  it("routes discriminated events to the right method", () => {
    const tg = mockTelegramWebApp();
    const h = createHaptic();
    h.trigger({ kind: "impact", style: "heavy" });
    h.trigger({ kind: "notification", type: "warning" });
    h.trigger({ kind: "selection" });
    expect(tg.impact).toHaveBeenCalledWith("heavy");
    expect(tg.notify).toHaveBeenCalledWith("warning");
    expect(tg.selection).toHaveBeenCalled();
  });

  it("applies sensible defaults", () => {
    const tg = mockTelegramWebApp();
    const h = createHaptic();
    h.trigger({ kind: "impact" });
    h.trigger({ kind: "notification" });
    expect(tg.impact).toHaveBeenCalledWith("light");
    expect(tg.notify).toHaveBeenCalledWith("success");
  });
});

describe("destroy semantics", () => {
  it("post-destroy calls fall through to noop", () => {
    const tg = mockTelegramWebApp();
    const h = createHaptic();
    h.impact();
    h.destroy();
    h.impact();
    expect(tg.impact).toHaveBeenCalledTimes(1);
    expect(h.getBackend()).toBe("noop");
  });

  it("is idempotent", () => {
    const h = createHaptic();
    h.destroy();
    expect(() => h.destroy()).not.toThrow();
  });
});
