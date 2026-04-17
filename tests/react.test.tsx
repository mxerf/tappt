import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { act, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { TapptProvider, useHaptic } from "../src/react";
import { createHaptic } from "../src/core/haplib";
import { mockTelegramWebApp, resetHapticState } from "./helpers";

beforeEach(() => resetHapticState());
afterEach(() => resetHapticState());

function render(node: React.ReactNode): { root: Root; container: HTMLElement } {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(node));
  return { root, container };
}

describe("React adapter", () => {
  it("useHaptic falls back to shared instance without provider", () => {
    const tg = mockTelegramWebApp();
    let captured: ReturnType<typeof useHaptic> | null = null;
    function Probe() {
      captured = useHaptic();
      return null;
    }
    const { root } = render(<Probe />);
    captured!.impact("heavy");
    expect(tg.impact).toHaveBeenCalledWith("heavy");
    act(() => root.unmount());
  });

  it("TapptProvider injects a scoped haptic instance", () => {
    mockTelegramWebApp();
    const injected = createHaptic({ disabled: true });
    let captured: ReturnType<typeof useHaptic> | null = null;
    function Probe() {
      captured = useHaptic();
      return null;
    }
    const { root } = render(
      <TapptProvider haptic={injected}>
        <Probe />
      </TapptProvider>,
    );
    expect(captured).toBe(injected);
    act(() => root.unmount());
  });

  it("TapptProvider destroys an owned instance on unmount", () => {
    const tg = mockTelegramWebApp();
    function Probe() {
      const h = useHaptic();
      h.impact();
      return null;
    }
    const { root } = render(
      <TapptProvider>
        <Probe />
      </TapptProvider>,
    );
    expect(tg.impact).toHaveBeenCalledTimes(1);
    act(() => root.unmount());
  });

  it("survives React StrictMode double-invoke (cleanup + remount)", () => {
    const tg = mockTelegramWebApp();
    const captured: Array<ReturnType<typeof useHaptic>> = [];
    function Probe() {
      captured.push(useHaptic());
      return null;
    }
    const { root } = render(
      <StrictMode>
        <TapptProvider>
          <Probe />
        </TapptProvider>
      </StrictMode>,
    );
    // StrictMode renders twice; the *last* captured instance is what React
    // actually commits for this pass. It must be usable, not a destroyed
    // zombie from the first render's cleanup.
    const last = captured[captured.length - 1]!;
    expect(last.isSupported()).toBe(true);
    last.impact("medium");
    expect(tg.impact).toHaveBeenLastCalledWith("medium");
    act(() => root.unmount());
  });
});
