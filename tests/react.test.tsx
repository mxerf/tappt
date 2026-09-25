import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { act, StrictMode, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { TapptProvider, useHaptic, useHapticRef } from "../src/react";
import { createHaptic } from "../src/core/haplib";
import { mockIosSwitch, mockTelegramWebApp, resetHapticState } from "./helpers";

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

describe("useHapticRef", () => {
  const overlayIn = (el: Element | null) => el?.querySelector("label[data-tappt-overlay]") ?? null;
  // happy-dom delivers MutationObserver records on a timer, not a microtask.
  const flushMutations = () => new Promise((resolve) => setTimeout(resolve, 0));

  it("attaches the element on mount and releases it on unmount", () => {
    mockIosSwitch();
    function Tap() {
      return <button ref={useHapticRef<HTMLButtonElement>()}>Tap</button>;
    }
    const { root, container } = render(
      <TapptProvider>
        <Tap />
      </TapptProvider>,
    );
    const button = container.querySelector("button");
    expect(overlayIn(button)).not.toBeNull();

    act(() => root.unmount());
    expect(overlayIn(button)).toBeNull();
  });

  it("keeps one attachment across re-renders of an inline event literal", async () => {
    mockIosSwitch();
    let setCount: (count: number) => void = () => {};
    function Counter() {
      const [count, set] = useState(0);
      setCount = set;
      return <button ref={useHapticRef({ kind: "impact", style: "light" })}>{count}</button>;
    }
    const { root, container } = render(
      <TapptProvider>
        <Counter />
      </TapptProvider>,
    );
    const button = container.querySelector("button");
    const overlay = overlayIn(button);
    expect(overlay).not.toBeNull();

    act(() => setCount(1));
    await flushMutations();

    expect(button?.textContent).toBe("1");
    expect(overlayIn(button)).toBe(overlay);
    act(() => root.unmount());
  });

  it("fires the declared event through the provider's instance", () => {
    const tg = mockTelegramWebApp();
    function Tap() {
      return <button ref={useHapticRef({ kind: "impact", style: "heavy" })}>Tap</button>;
    }
    const { root, container } = render(
      <TapptProvider>
        <Tap />
      </TapptProvider>,
    );

    act(() => container.querySelector("button")?.click());
    expect(tg.impact).toHaveBeenCalledWith("heavy");
    act(() => root.unmount());
  });
});
