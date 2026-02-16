import { describe, it, expect, vi } from "vitest";
import { Page } from "../src/core/Page.js";
import { Logger } from "../src/logging/Logger.js";
import { AutomationEvents } from "../src/core/Events.js";

describe("page goto lifecycle handling", () => {
  it("clears stale lifecycle events before navigating", async () => {
    const session = {
      send: vi.fn(async (method: string) => {
        if (method === "Page.getFrameTree") {
          return { frameTree: { frame: { id: "main", url: "about:blank" } } };
        }
        return {};
      }),
      on: vi.fn()
    } as any;

    const page = new Page(session, new Logger("error"), new AutomationEvents());
    await page.initialize();

    (page as any).lifecycleEvents.set("main", new Set(["load"]));

    await expect(page.goto("https://example.com", { waitUntil: "load", timeoutMs: 120 })).rejects.toThrow(
      "Timeout waiting for lifecycle event: load"
    );
  });
});
