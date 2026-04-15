import { describe, expect, it, vi } from "vitest";
import { Frame } from "../src/core/Frame.js";
import { Logger } from "../src/logging/Logger.js";
import { AutomationEvents } from "../src/core/Events.js";

describe("frame auto wait", () => {
  it("waits for a selector to appear before reading text", async () => {
    vi.useFakeTimers();
    const evaluateModes: boolean[] = [];
    let presenceCalls = 0;

    const session = {
      send: vi.fn(async (method: string, params: Record<string, unknown>) => {
        if (method === "Runtime.evaluate") {
          evaluateModes.push(Boolean(params.returnByValue));
          if (params.returnByValue === false) {
            presenceCalls += 1;
            if (presenceCalls === 1) {
              return { result: { subtype: "null" } };
            }
            return { result: { objectId: "object-1" } };
          }
          return { result: { value: "ready" } };
        }
        if (method === "Runtime.releaseObject") {
          return {};
        }
        return {};
      })
    } as any;

    const frame = new Frame("frame-1", session, new Logger("error"), new AutomationEvents());
    const promise = frame.text("#delayed");
    await vi.advanceTimersByTimeAsync(100);

    await expect(promise).resolves.toBe("ready");
    expect(evaluateModes).toEqual([false, false, true]);

    vi.useRealTimers();
  });

  it("waits for a selector to appear before setting a select option", async () => {
    vi.useFakeTimers();
    const evaluateModes: boolean[] = [];
    let presenceCalls = 0;

    const session = {
      send: vi.fn(async (method: string, params: Record<string, unknown>) => {
        if (method === "Runtime.evaluate") {
          evaluateModes.push(Boolean(params.returnByValue));
          if (params.returnByValue === false) {
            presenceCalls += 1;
            if (presenceCalls === 1) {
              return { result: { subtype: "null" } };
            }
            return { result: { objectId: "object-1" } };
          }
          return { result: { value: true } };
        }
        if (method === "Runtime.releaseObject") {
          return {};
        }
        return {};
      })
    } as any;

    const frame = new Frame("frame-1", session, new Logger("error"), new AutomationEvents());
    const promise = frame.selectOption("#delayed-select", "ready");
    await vi.advanceTimersByTimeAsync(100);

    await expect(promise).resolves.toBeUndefined();
    expect(evaluateModes).toEqual([false, false, true]);

    vi.useRealTimers();
  });
});
