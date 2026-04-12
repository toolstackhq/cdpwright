import { describe, expect, it, vi } from "vitest";
import { Page } from "../src/core/Page.js";
import { Logger } from "../src/logging/Logger.js";
import { AutomationEvents } from "../src/core/Events.js";

describe("Page.content", () => {
  it("waits for load and returns serialized html", async () => {
    const calls: string[] = [];
    const session = {
      send: vi.fn(async (method: string, params?: Record<string, unknown>) => {
        calls.push(method);
        if (method === "Page.getFrameTree") {
          return { frameTree: { frame: { id: "main", url: "https://example.com" } } };
        }
        if (method === "Runtime.evaluate" && params?.expression === "document.readyState") {
          return { result: { value: "complete" } };
        }
        if (method === "Runtime.evaluate") {
          return { result: { value: "<!DOCTYPE html>\n<html><head></head><body><h1>Example</h1></body></html>" } };
        }
        return {};
      }),
      on: vi.fn(),
    };
    const page = new Page(session as never, new Logger("error"), new AutomationEvents());
    await page.initialize();

    const html = await page.content();

    expect(html).toContain("<h1>Example</h1>");
    expect(calls).toEqual([
      "Page.enable",
      "DOM.enable",
      "Runtime.enable",
      "Network.enable",
      "Page.setLifecycleEventsEnabled",
      "Page.getFrameTree",
      "Runtime.evaluate",
      "Runtime.evaluate",
    ]);
  });
});
