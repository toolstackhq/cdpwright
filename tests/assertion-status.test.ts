import { describe, it, expect, vi } from "vitest";
import { expect as automatonExpect } from "../src/assert/expect.js";
import { AssertionError } from "../src/assert/AssertionError.js";
import { AutomationEvents } from "../src/core/Events.js";

describe("assertion status events", () => {
  it("emits failed status when an assertion times out", async () => {
    const events = new AutomationEvents();
    const statuses: Array<"passed" | "failed" | undefined> = [];
    events.on("assertion:end", (payload) => statuses.push(payload.status));

    const frame = {
      id: "frame-1",
      exists: vi.fn(async () => false)
    };

    const page = {
      mainFrame: () => frame,
      frame: () => frame,
      getEvents: () => events
    } as any;

    await expect(automatonExpect(page).element("#missing", { timeoutMs: 80 }).toExist()).rejects.toBeInstanceOf(AssertionError);
    expect(statuses).toContain("failed");
  });

  it("emits passed status when an assertion succeeds", async () => {
    const events = new AutomationEvents();
    const statuses: Array<"passed" | "failed" | undefined> = [];
    events.on("assertion:end", (payload) => statuses.push(payload.status));

    const frame = {
      id: "frame-1",
      exists: vi.fn(async () => true)
    };

    const page = {
      mainFrame: () => frame,
      frame: () => frame,
      getEvents: () => events
    } as any;

    await automatonExpect(page).element("#ready").toExist();
    expect(statuses).toContain("passed");
  });
});
