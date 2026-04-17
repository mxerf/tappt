const VERSION_PROBE = "https://esm.sh/@mxerf/tappt/package.json";

const REAL_TG_PLATFORMS = new Set([
  "android",
  "android_x",
  "ios",
  "macos",
  "tdesktop",
  "weba",
  "webk",
]);

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

function isRealTg() {
  const tg = window.Telegram && window.Telegram.WebApp;
  if (!tg || !tg.HapticFeedback) return false;
  if (typeof tg.initData === "string" && tg.initData.length > 0) return true;
  if (typeof tg.platform === "string" && REAL_TG_PLATFORMS.has(tg.platform)) {
    return true;
  }
  return false;
}

function hasIosSwitch() {
  return (
    typeof HTMLInputElement !== "undefined" &&
    "switch" in HTMLInputElement.prototype
  );
}

function hasVibrate() {
  return (
    typeof navigator !== "undefined" && typeof navigator.vibrate === "function"
  );
}

async function renderStatus(haptic) {
  flag("has-tg", isRealTg());
  flag("has-switch", hasIosSwitch());
  flag("has-vibrate", hasVibrate());
  text("backend", haptic ? haptic.getBackend() : "—");

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

function bindButtons(haptic) {
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
      text("backend", haptic.getBackend());
    });
  });
}

function showLoadError(err) {
  text("backend", "load-error");
  const details = document.createElement("pre");
  details.className = "error";
  details.textContent = `Failed to load @mxerf/tappt from esm.sh\n\n${err?.message ?? err}`;
  document.querySelector("main")?.prepend(details);
}

(async () => {
  try {
    const { createHaptic } = await import("https://esm.sh/@mxerf/tappt");
    const haptic = createHaptic();
    await renderStatus(haptic);
    bindButtons(haptic);
  } catch (err) {
    console.error(err);
    showLoadError(err);
  }
})();
