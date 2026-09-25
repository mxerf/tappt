import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createApp, defineComponent, h, nextTick, ref, resolveDirective, withDirectives } from "vue";
import { tapptPlugin, useHaptic, vHaptic } from "../src/vue";
import { mockIosSwitch, mockTelegramWebApp, resetHapticState } from "./helpers";
import type { ImpactStyle } from "../src/core/types";

beforeEach(() => resetHapticState());
afterEach(() => resetHapticState());

describe("Vue adapter", () => {
  it("useHaptic falls back to shared instance without plugin", () => {
    const tg = mockTelegramWebApp();
    let captured: ReturnType<typeof useHaptic> | null = null;
    const Probe = defineComponent({
      setup() {
        captured = useHaptic();
        return () => null;
      },
    });
    const app = createApp(Probe);
    const el = document.createElement("div");
    document.body.appendChild(el);
    app.mount(el);
    captured!.impact("medium");
    expect(tg.impact).toHaveBeenCalledWith("medium");
    app.unmount();
  });

  it("tapptPlugin provides an instance via inject", () => {
    const tg = mockTelegramWebApp();
    let captured: ReturnType<typeof useHaptic> | null = null;
    const Probe = defineComponent({
      setup() {
        captured = useHaptic();
        return () => null;
      },
    });
    const app = createApp({
      render: () => h(Probe),
    });
    app.use(tapptPlugin());
    const el = document.createElement("div");
    document.body.appendChild(el);
    app.mount(el);
    captured!.notify("warning");
    expect(tg.notify).toHaveBeenCalledWith("warning");
    app.unmount();
  });

  it("scoped: true creates a per-component instance", () => {
    mockTelegramWebApp();
    const instances: unknown[] = [];
    const Probe = defineComponent({
      setup() {
        instances.push(useHaptic({ scoped: true }));
        return () => null;
      },
    });
    const app = createApp({
      render: () => [h(Probe), h(Probe)],
    });
    const el = document.createElement("div");
    document.body.appendChild(el);
    app.mount(el);
    expect(instances[0]).not.toBe(instances[1]);
    app.unmount();
  });
});

describe("v-haptic", () => {
  function mount(app: ReturnType<typeof createApp>): HTMLElement {
    const el = document.createElement("div");
    document.body.appendChild(el);
    app.mount(el);
    return el;
  }

  it("attaches through the plugin's instance and releases on unmount", () => {
    mockIosSwitch();
    const Tap = defineComponent({
      setup() {
        const haptic = resolveDirective("haptic");
        return () => withDirectives(h("button", "Tap"), haptic ? [[haptic]] : []);
      },
    });
    const app = createApp(Tap).use(tapptPlugin());
    const root = mount(app);
    const button = root.querySelector("button");
    expect(button?.querySelector("label[data-tappt-overlay]")).not.toBeNull();

    app.unmount();
    expect(button?.querySelector("label[data-tappt-overlay]")).toBeNull();
  });

  it("fires the declared event and follows its changes", async () => {
    const tg = mockTelegramWebApp();
    const style = ref<ImpactStyle>("light");
    const Tap = defineComponent({
      setup() {
        return () => withDirectives(h("button", "Tap"), [[vHaptic, { kind: "impact", style: style.value }]]);
      },
    });
    const app = createApp(Tap);
    const button = mount(app).querySelector("button");

    button?.click();
    style.value = "heavy";
    await nextTick();
    button?.click();

    expect(tg.impact.mock.calls).toEqual([["light"], ["heavy"]]);
    app.unmount();
  });
});
