import type { Backend } from "../types";

export const noopBackend: Backend = {
  name: "noop",
  isAvailable() {
    return true;
  },
  impact() {},
  notify() {},
  selection() {},
};
