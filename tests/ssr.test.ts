/**
 * @vitest-environment node
 */
import { describe, it, expect } from "vitest";
import { createHaptic } from "../src/core/haplib";

describe("SSR safety", () => {
  it("loads without document/window and never throws", () => {
    const h = createHaptic();
    expect(() => h.impact()).not.toThrow();
    expect(() => h.notify("error")).not.toThrow();
    expect(() => h.selection()).not.toThrow();
    expect(h.getBackend()).toBe("noop");
    expect(h.isSupported()).toBe(false);
  });
});
