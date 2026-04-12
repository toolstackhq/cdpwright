import { describe, expect, it, vi } from "vitest";
import { Page } from "../src/core/Page.js";
import { Logger } from "../src/logging/Logger.js";
import { AutomationEvents } from "../src/core/Events.js";

function createSession(responses: Record<string, unknown[]>) {
  const calls: string[] = [];
  const session = {
    send: vi.fn(async (method: string) => {
      calls.push(method);
      const queue = responses[method] ?? [];
      const value = queue.length > 0 ? queue.shift() : undefined;
      if (value !== undefined) {
        return value;
      }
      return {};
    }),
    on: vi.fn()
  };
  return { session, calls };
}

describe("page load wait", () => {
  it("waits for load before screenshotting", async () => {
    const { session, calls } = createSession({
      "Page.getFrameTree": [{ frameTree: { frame: { id: "main", url: "https://example.com" } } }],
      "Runtime.evaluate": [
        { result: { value: "loading" } },
        { result: { value: "complete" } },
      ],
      "Page.captureScreenshot": [{ data: Buffer.from("png").toString("base64") }],
    });
    const page = new Page(session as never, new Logger("error"), new AutomationEvents());
    await page.initialize();

    await page.screenshot();

    expect(calls).toEqual([
      "Page.enable",
      "DOM.enable",
      "Runtime.enable",
      "Network.enable",
      "Page.setLifecycleEventsEnabled",
      "Page.getFrameTree",
      "Runtime.evaluate",
      "Runtime.evaluate",
      "Page.captureScreenshot",
    ]);
  });

  it("waits for load before generating pdf", async () => {
    const pdfBytes = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF", "utf-8");
    const { session, calls } = createSession({
      "Page.getFrameTree": [{ frameTree: { frame: { id: "main", url: "https://example.com" } } }],
      "Runtime.evaluate": [
        { result: { value: "loading" } },
        { result: { value: "complete" } },
      ],
      "Page.printToPDF": [{ data: pdfBytes.toString("base64") }],
    });
    const page = new Page(session as never, new Logger("error"), new AutomationEvents());
    await page.initialize();

    const result = await page.pdf();

    expect(result.equals(pdfBytes)).toBe(true);
    expect(calls).toEqual([
      "Page.enable",
      "DOM.enable",
      "Runtime.enable",
      "Network.enable",
      "Page.setLifecycleEventsEnabled",
      "Page.getFrameTree",
      "Runtime.evaluate",
      "Runtime.evaluate",
      "Emulation.setEmulatedMedia",
      "Page.printToPDF",
      "Emulation.setEmulatedMedia",
    ]);
  });
});
