import type { Backend, ImpactStyle, NotificationType } from "../types";
import { hasWindow } from "../env";

interface TelegramHapticFeedback {
  impactOccurred(style: "light" | "medium" | "heavy" | "rigid" | "soft"): void;
  notificationOccurred(type: "error" | "success" | "warning"): void;
  selectionChanged(): void;
}

interface TelegramWebApp {
  HapticFeedback?: TelegramHapticFeedback;
}

interface WindowWithTelegram {
  Telegram?: { WebApp?: TelegramWebApp };
}

function getFeedback(): TelegramHapticFeedback | null {
  if (!hasWindow()) return null;
  const tg = (window as unknown as WindowWithTelegram).Telegram?.WebApp;
  const fb = tg?.HapticFeedback;
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
