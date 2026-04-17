import type { Backend, ImpactStyle, NotificationType } from "../types";
import { hasWindow } from "../env";

interface TelegramHapticFeedback {
  impactOccurred(style: "light" | "medium" | "heavy" | "rigid" | "soft"): void;
  notificationOccurred(type: "error" | "success" | "warning"): void;
  selectionChanged(): void;
}

interface TelegramWebApp {
  HapticFeedback?: TelegramHapticFeedback;
  initData?: string;
  platform?: string;
  version?: string;
}

interface WindowWithTelegram {
  Telegram?: { WebApp?: TelegramWebApp };
}

// Platforms the official Telegram clients identify themselves as. Anything
// outside this set (e.g. "unknown" from the public telegram-web-app.js stub
// loaded on a plain website) means we are NOT inside a real Mini App.
const REAL_TG_PLATFORMS = new Set([
  "android",
  "android_x",
  "ios",
  "macos",
  "tdesktop",
  "weba",
  "webk",
]);

function isRealMiniApp(tg: TelegramWebApp): boolean {
  if (typeof tg.initData === "string" && tg.initData.length > 0) return true;
  if (typeof tg.platform === "string" && REAL_TG_PLATFORMS.has(tg.platform)) return true;
  return false;
}

function getFeedback(): TelegramHapticFeedback | null {
  if (!hasWindow()) return null;
  const tg = (window as unknown as WindowWithTelegram).Telegram?.WebApp;
  if (!tg || !isRealMiniApp(tg)) return null;
  const fb = tg.HapticFeedback;
  if (!fb) return null;
  if (
    typeof fb.impactOccurred !== "function" ||
    typeof fb.notificationOccurred !== "function" ||
    typeof fb.selectionChanged !== "function"
  ) {
    return null;
  }
  return fb;
}

export const telegramBackend: Backend = {
  name: "telegram",
  isAvailable() {
    return getFeedback() !== null;
  },
  impact(style: ImpactStyle) {
    const fb = getFeedback();
    if (!fb) return;
    try {
      fb.impactOccurred(style);
    } catch {
      /* swallow — user may be on an old TG client */
    }
  },
  notify(type: NotificationType) {
    const fb = getFeedback();
    if (!fb) return;
    try {
      fb.notificationOccurred(type);
    } catch {
      /* noop */
    }
  },
  selection() {
    const fb = getFeedback();
    if (!fb) return;
    try {
      fb.selectionChanged();
    } catch {
      /* noop */
    }
  },
};
