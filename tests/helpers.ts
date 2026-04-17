import { beforeEach, afterEach, vi } from "vitest";

export function mockTelegramWebApp() {
  const spy = {
    impact: vi.fn(),
    notify: vi.fn(),
    selection: vi.fn(),
  };
  (window as unknown as {
    Telegram: { WebApp: unknown };
  }).Telegram = {
    WebApp: {
      initData: "query_id=TEST&user=%7B%22id%22%3A1%7D",
      platform: "ios",
      version: "7.6",
      HapticFeedback: {
        impactOccurred: spy.impact,
        notificationOccurred: spy.notify,
        selectionChanged: spy.selection,
      },
    },
  };
  return spy;
}

/** Mount the public telegram-web-app.js stub-like object — no initData, platform=unknown. */
export function mockTelegramStub() {
  (window as unknown as {
    Telegram: { WebApp: unknown };
  }).Telegram = {
    WebApp: {
      initData: "",
      platform: "unknown",
      version: "6.0",
      HapticFeedback: {
        impactOccurred: vi.fn(),
        notificationOccurred: vi.fn(),
        selectionChanged: vi.fn(),
      },
    },
  };
}

export function clearTelegram() {
  delete (window as unknown as { Telegram?: unknown }).Telegram;
}

export function mockIosSwitch() {
  Object.defineProperty(HTMLInputElement.prototype, "switch", {
    configurable: true,
    get() {
      return this.getAttribute("switch") !== null;
    },
    set(v: boolean) {
      if (v) this.setAttribute("switch", "");
      else this.removeAttribute("switch");
    },
  });
}

export function clearIosSwitch() {
  if (Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "switch")) {
    Reflect.deleteProperty(HTMLInputElement.prototype, "switch");
  }
}

export function mockVibrate() {
  const spy = vi.fn().mockReturnValue(true);
  Object.defineProperty(navigator, "vibrate", {
    configurable: true,
    writable: true,
    value: spy,
  });
  return spy;
}

export function clearVibrate() {
  Object.defineProperty(navigator, "vibrate", {
    configurable: true,
    writable: true,
    value: undefined,
  });
}

export function resetHapticState() {
  clearTelegram();
  clearIosSwitch();
  clearVibrate();
  document.body.innerHTML = "";
}

export function wireCleanup() {
  beforeEach(() => resetHapticState());
  afterEach(() => resetHapticState());
}
