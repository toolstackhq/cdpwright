import { describe, it, expect as vitestExpect, vi } from "vitest";
import { expect as automatonExpect } from "../src/assert/expect.js";
import { AutomationEvents } from "../src/core/Events.js";

const events = new AutomationEvents();

describe("assertion polling", () => {
  it("polls until condition is met", async () => {
    vi.useFakeTimers();

    let calls = 0;
    const frame = {
      id: "frame-1",
      exists: vi.fn(async () => {
        calls += 1;
        return calls >= 3;
      }),
      isVisible: vi.fn(async () => true),
      text: vi.fn(async () => "text")
    };

    const page = {
      mainFrame: () => frame,
      frame: () => frame,
      getEvents: () => events
    } as any;

    const promise = automatonExpect(page).element("#ready").toExist();
    await vi.advanceTimersByTimeAsync(250);
    await promise;

    vitestExpect(calls).toBeGreaterThanOrEqual(3);
    vi.useRealTimers();
  });
});
