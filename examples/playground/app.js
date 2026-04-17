// ============================================================================
// i18n dictionaries
// ============================================================================

const DICT = {
  en: {
    tagline: "Tiny, SSR-safe haptic feedback for the web.",
    "section.env": "Environment",
    "env.backend": "Active backend",
    "env.version": "Package",
    "env.tg": "Telegram Mini App",
    "env.switch": "iOS switch element",
    "env.vibrate": "navigator.vibrate",
    "section.try": "Try it",
    "try.hint": "Open on a phone — these are real hardware pulses, not sound.",
    "group.impact": "short tap",
    "group.notify": "event feedback",
    "group.selection": "light tap",
    "impact.note":
      "On iOS Safari all impact styles produce the same pulse — the <input type=\"checkbox\" switch> element gives only one Taptic kind. Inside Telegram or Android all five are distinct.",
    "section.install": "Install",
    "copy.idle": "Copy",
    "copy.done": "Copied",
    "copy.aria": "Copy install command",
    "section.api": "API",
    "api.snippet":
      'import { haptic } from "@mxerf/tappt";\n\nhaptic.impact("medium");\nhaptic.notify("success");\nhaptic.selection();',
    "api.impact": "short tap — buttons, toggles, drag endpoints",
    "api.notify": "event feedback — form success, warning, error",
    "api.selection": "very light tap — tab switches, picker steps",
    "api.trigger": "dispatch a discriminated HapticEvent",
    "api.getBackend": "which backend is active",
    "api.isSupported": "true if any real backend works",
    "api.destroy": "release DOM rig and internal state",
    "section.backends": "Backend priority",
    "backends.hint": "On first use tappt picks the first available backend:",
    "backend.telegram":
      "Native bridge via window.Telegram.WebApp.HapticFeedback inside a real Telegram Mini App",
    "backend.iosSwitch":
      "Hidden <input type=\"checkbox\" switch> element, iOS 17.4+ Safari only",
    "backend.vibration": "navigator.vibrate(pattern) — Android and most desktop browsers",
    "backend.noop": "Silent fallback — old iOS, locked-down browsers, SSR",
    "section.limits": "Known limitations",
    "limit.iosImpact":
      "iOS Safari cannot differentiate impact styles — all five feel the same.",
    "limit.androidVary":
      "Vibration API behaviour varies wildly between Android devices; don't encode meaning into small duration differences.",
    "limit.notifyQueue":
      "notify() on iOS uses repeated pulses with a 55 ms gap; overlapping calls serialise via an internal queue.",
    "limit.userGesture":
      "navigator.vibrate requires a real user gesture — call haptic methods from click/touch handlers.",
    "footer.touch": "Open this page on a real phone for actual haptics.",
    "footer.best": "Best results inside Telegram Mini App or iOS Safari 17.4+.",
  },
  ru: {
    tagline: "Маленькая SSR-безопасная библиотека тактильной отдачи для веба.",
    "section.env": "Окружение",
    "env.backend": "Активный бэкенд",
    "env.version": "Пакет",
    "env.tg": "Telegram Mini App",
    "env.switch": "iOS switch-элемент",
    "env.vibrate": "navigator.vibrate",
    "section.try": "Попробуй",
    "try.hint": "Открой на телефоне — это настоящие пульсы железа, а не звук.",
    "group.impact": "короткий тап",
    "group.notify": "событийная отдача",
    "group.selection": "лёгкий тап",
    "impact.note":
      "В iOS Safari все стили impact дают одинаковый пульс — элемент <input type=\"checkbox\" switch> поддерживает только один вид Taptic. Внутри Telegram и на Android все пять различаются.",
    "section.install": "Установка",
    "copy.idle": "Копировать",
    "copy.done": "Скопировано",
    "copy.aria": "Скопировать команду установки",
    "section.api": "API",
    "api.snippet":
      'import { haptic } from "@mxerf/tappt";\n\nhaptic.impact("medium");\nhaptic.notify("success");\nhaptic.selection();',
    "api.impact": "короткий тап — кнопки, тумблеры, концы drag-жестов",
    "api.notify": "событийная отдача — успех/ошибка/предупреждение",
    "api.selection": "очень лёгкий тап — вкладки, шаги пикера",
    "api.trigger": "отправить discriminated HapticEvent",
    "api.getBackend": "какой бэкенд активен",
    "api.isSupported": "true, если есть работающий бэкенд",
    "api.destroy": "освободить DOM-rig и внутреннее состояние",
    "section.backends": "Приоритет бэкендов",
    "backends.hint":
      "При первом вызове tappt берёт первый доступный из списка:",
    "backend.telegram":
      "Нативный мост через window.Telegram.WebApp.HapticFeedback внутри реального TG Mini App",
    "backend.iosSwitch":
      "Скрытый <input type=\"checkbox\" switch>, только iOS Safari 17.4+",
    "backend.vibration":
      "navigator.vibrate(pattern) — Android и большинство десктопных браузеров",
    "backend.noop":
      "Тихий fallback — старые iOS, изолированные браузеры, SSR",
    "section.limits": "Известные ограничения",
    "limit.iosImpact":
      "iOS Safari не различает стили impact — все пять ощущаются одинаково.",
    "limit.androidVary":
      "Поведение Vibration API сильно отличается от устройства к устройству; не закладывай смысл в небольшие различия длительности.",
    "limit.notifyQueue":
      "notify() на iOS эмулируется повторяющимися пульсами с паузой 55 мс; перекрывающиеся вызовы сериализуются внутренней очередью.",
    "limit.userGesture":
      "navigator.vibrate требует реального user gesture — вызывай haptic из click/touch обработчиков.",
    "footer.touch": "Открой эту страницу на настоящем телефоне — будут настоящие haptics.",
    "footer.best": "Лучше всего — внутри Telegram Mini App или в iOS Safari 17.4+.",
  },
};

// ============================================================================
// Environment detection (mirrors tappt's own backend priority)
// ============================================================================

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

// ============================================================================
// Install snippets
// ============================================================================

const INSTALL = {
  bun: "bun add @mxerf/tappt",
  npm: "npm i @mxerf/tappt",
  pnpm: "pnpm add @mxerf/tappt",
  yarn: "yarn add @mxerf/tappt",
};

// ============================================================================
// UI helpers
// ============================================================================

function $(sel) {
  return document.querySelector(sel);
}

function $$(sel) {
  return document.querySelectorAll(sel);
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function setFlag(id, condition) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = condition ? "yes" : "no";
  el.dataset.state = condition ? "yes" : "no";
}

function applyI18n(lang) {
  document.documentElement.lang = lang;
  const dict = DICT[lang] ?? DICT.en;
  $$("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    const value = dict[key];
    if (!value) return;
    // `api.snippet` contains newlines — preserve them via textContent on <code>.
    if (el.tagName === "CODE") {
      el.textContent = value;
    } else if (value.includes("<")) {
      el.innerHTML = value;
    } else {
      el.textContent = value;
    }
  });
  $$("[data-i18n-aria]").forEach((el) => {
    const key = el.dataset.i18nAria;
    const value = dict[key];
    if (value) el.setAttribute("aria-label", value);
  });
}

function bindLangToggle() {
  const buttons = $$(".lang-btn");
  const preferred = document.documentElement.lang === "ru" ? "ru" : "en";
  const saved = localStorage.getItem("tappt-lang");
  const initial = saved && (saved === "ru" || saved === "en") ? saved : preferred;
  setLang(initial);

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      setLang(btn.dataset.lang);
    });
  });

  function setLang(lang) {
    applyI18n(lang);
    buttons.forEach((b) => b.classList.toggle("is-active", b.dataset.lang === lang));
    try {
      localStorage.setItem("tappt-lang", lang);
    } catch {}
    // Re-label copy button in case it's mid-animation.
    const copy = $("#copy-install");
    if (copy && !copy.classList.contains("is-done")) {
      const span = copy.querySelector("span");
      if (span) span.textContent = DICT[lang]["copy.idle"];
    }
  }
}

/**
 * iOS Safari's :active is unreliable, especially when buttons are in a
 * scrollable container — the browser treats tap as a scroll start. We bind
 * pointer events manually so feedback is instant.
 */
function bindPressFeedback(root = document) {
  const targets = root.querySelectorAll("button[data-kind], button.copy");
  targets.forEach((el) => {
    const press = () => el.classList.add("is-pressed");
    const release = () => el.classList.remove("is-pressed");
    el.addEventListener("pointerdown", press);
    el.addEventListener("pointerup", release);
    el.addEventListener("pointercancel", release);
    el.addEventListener("pointerleave", release);
  });
}

function bindInstallTabs() {
  const tabs = $$(".tab");
  const code = $("#install-code");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.toggle("is-active", t === tab));
      code.textContent = INSTALL[tab.dataset.pm];
    });
  });
}

function bindCopy() {
  const btn = $("#copy-install");
  const code = $("#install-code");
  if (!btn || !code) return;
  btn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(code.textContent ?? "");
      const span = btn.querySelector("span");
      const lang = document.documentElement.lang === "ru" ? "ru" : "en";
      const original = DICT[lang]["copy.idle"];
      if (span) span.textContent = DICT[lang]["copy.done"];
      btn.classList.add("is-done");
      setTimeout(() => {
        if (span) span.textContent = original;
        btn.classList.remove("is-done");
      }, 1400);
    } catch (err) {
      console.error("Clipboard write failed", err);
    }
  });
}

function applyBackendVisibility(backendName) {
  // On ios-switch the hardware only supports ONE pulse kind. Showing 5 impact
  // buttons misleads the user ("why do they all feel the same?"). Collapse
  // to a single button and surface an explanation.
  const impactGroup = document.querySelector('[data-group="impact"]');
  if (!impactGroup) return;
  const note = document.getElementById("impact-note");
  const buttons = impactGroup.querySelectorAll("button[data-kind='impact']");
  if (backendName === "ios-switch") {
    buttons.forEach((btn, i) => {
      btn.hidden = i !== 0;
    });
    const first = buttons[0];
    if (first) first.textContent = "Tap";
    if (note) note.hidden = false;
  } else {
    buttons.forEach((btn) => (btn.hidden = false));
    buttons.forEach((btn) => {
      const style = btn.dataset.style;
      btn.textContent = style ? style[0].toUpperCase() + style.slice(1) : btn.textContent;
    });
    if (note) note.hidden = true;
  }
}

async function loadVersion() {
  try {
    const res = await fetch(VERSION_PROBE, { cache: "no-store" });
    if (res.ok) {
      const pkg = await res.json();
      setText("version", `@mxerf/tappt@${pkg.version}`);
    }
  } catch {}
}

function updateEnvCard(haptic) {
  setFlag("has-tg", isRealTg());
  setFlag("has-switch", hasIosSwitch());
  setFlag("has-vibrate", hasVibrate());
  setText("backend", haptic.getBackend());
}

function showLoadError(err) {
  setText("backend", "load-error");
  const details = document.createElement("pre");
  details.className = "error";
  details.textContent = `Failed to load @mxerf/tappt from esm.sh\n\n${err?.message ?? err}`;
  $("main")?.prepend(details);
}

// ============================================================================
// Boot
// ============================================================================

async function boot() {
  bindLangToggle();
  bindInstallTabs();
  bindCopy();
  bindPressFeedback();
  loadVersion();

  try {
    const { createHaptic } = await import("https://esm.sh/@mxerf/tappt");
    const haptic = createHaptic();
    updateEnvCard(haptic);
    applyBackendVisibility(haptic.getBackend());

    $$("button[data-kind]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const kind = btn.dataset.kind;
        if (kind === "impact") {
          haptic.impact(btn.dataset.style);
        } else if (kind === "notify") {
          haptic.notify(btn.dataset.type);
        } else if (kind === "selection") {
          haptic.selection();
        }
        setText("backend", haptic.getBackend());
      });
    });
  } catch (err) {
    console.error(err);
    showLoadError(err);
  }
}

boot();
