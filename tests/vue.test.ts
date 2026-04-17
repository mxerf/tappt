import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createApp, defineComponent, h } from "vue";
import { haplibPlugin, useHaptic } from "../src/vue";
import { mockTelegramWebApp, resetHapticState } from "./helpers";

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

  it("haplibPlugin provides an instance via inject", () => {
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
    app.use(haplibPlugin());
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
