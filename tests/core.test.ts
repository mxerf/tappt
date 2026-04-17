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
