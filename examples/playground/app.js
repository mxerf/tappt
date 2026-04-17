import { createHaptic } from "https://esm.sh/@mxerf/tappt";

const VERSION_PROBE = "https://esm.sh/@mxerf/tappt/package.json";

const haptic = createHaptic();

function text(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function flag(id, condition) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = condition ? "yes" : "no";
  el.dataset.state = condition ? "yes" : "no";
}

function detectBackend() {
  // Mirrors the library's own priority so the status card reflects reality
  // without having to call haptic first.
  const tg = typeof window !== "undefined" && window.Telegram?.WebApp?.HapticFeedback;
  if (tg) return "telegram";
  const hasSwitch =
    typeof HTMLInputElement !== "undefined" &&
    "switch" in HTMLInputElement.prototype;
  if (hasSwitch) return "ios-switch";
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    return "vibration";
  }
  return "noop";
}

async function renderStatus() {
  const backend = haptic.getBackend();
  text("backend", backend);

  flag("has-tg", !!window.Telegram?.WebApp?.HapticFeedback);
  flag(
    "has-switch",
    typeof HTMLInputElement !== "undefined" &&
      "switch" in HTMLInputElement.prototype,
  );
  flag(
    "has-vibrate",
    typeof navigator !== "undefined" && typeof navigator.vibrate === "function",
  );

  try {
    const res = await fetch(VERSION_PROBE, { cache: "no-store" });
    if (res.ok) {
      const pkg = await res.json();
      text("version", `@mxerf/tappt@${pkg.version}`);
    } else {
      text("version", "@mxerf/tappt");
    }
  } catch {
    text("version", "@mxerf/tappt");
  }
}

function bindButtons() {
  document.querySelectorAll("button[data-kind]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const kind = btn.dataset.kind;
      if (kind === "impact") {
        haptic.impact(btn.dataset.style);
      } else if (kind === "notify") {
        haptic.notify(btn.dataset.type);
      } else if (kind === "selection") {
        haptic.selection();
      }
      // Refresh the backend label — first call may have resolved it lazily.
      text("backend", haptic.getBackend());
    });
  });
}

// Let TG's JS bootstrap attach window.Telegram before we probe — telegram-web-app.js
// attaches synchronously, but we wait a tick for safety.
queueMicrotask(() => {
  // Pre-warm backend resolution so the status card is accurate immediately.
  const prewarm = detectBackend();
  text("backend", prewarm);
  renderStatus();
  bindButtons();
});
