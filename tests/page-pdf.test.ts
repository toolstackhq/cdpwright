import fs from "fs";
import os from "os";
import path from "path";
import { describe, expect, it, vi } from "vitest";
import { AutomationEvents } from "../src/core/Events.js";
import { Logger } from "../src/logging/Logger.js";
import { Page } from "../src/core/Page.js";

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "cdpwright-page-pdf-"));
}

describe("Page.pdf", () => {
  it("writes decoded PDF bytes to disk", async () => {
    const pdfBytes = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF", "utf-8");
    const tempDir = createTempDir();
    const output = path.join(tempDir, "page.pdf");
    const calls: Array<{ method: string; params: Record<string, unknown> }> = [];
    const session = {
      send: vi.fn(async (method: string, params: Record<string, unknown>) => {
        calls.push({ method, params });
        if (method === "Page.getFrameTree") {
          return { frameTree: { frame: { id: "main", url: "https://example.com" } } };
        }
        if (method === "Runtime.evaluate") {
          return { result: { value: "complete" } };
        }
        if (method === "Page.printToPDF") {
          return { data: pdfBytes.toString("base64") };
        }
        return {};
      }),
      on: vi.fn(),
    };
    const page = new Page(session as never, new Logger("error"), new AutomationEvents());
    await page.initialize();

    try {
      const buffer = await page.pdf({ path: output });
      expect(buffer.equals(pdfBytes)).toBe(true);
      expect(fs.existsSync(output)).toBe(true);
      expect(fs.readFileSync(output).equals(pdfBytes)).toBe(true);
      expect(calls.map((call) => call.method)).toEqual([
        "Page.enable",
        "DOM.enable",
        "Runtime.enable",
        "Network.enable",
        "Page.setLifecycleEventsEnabled",
        "Page.getFrameTree",
        "Runtime.evaluate",
        "Emulation.setEmulatedMedia",
        "Page.printToPDF",
        "Emulation.setEmulatedMedia",
      ]);
      expect(calls[7]?.params).toEqual({ media: "screen" });
      expect(calls[9]?.params).toEqual({ media: "" });
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("rejects non-PDF CDP payloads", async () => {
    const tempDir = createTempDir();
    const output = path.join(tempDir, "page.pdf");
    const calls: string[] = [];
    const session = {
      send: vi.fn(async (method: string) => {
        calls.push(method);
        if (method === "Page.getFrameTree") {
          return { frameTree: { frame: { id: "main", url: "https://example.com" } } };
        }
        if (method === "Runtime.evaluate") {
          return { result: { value: "complete" } };
        }
        if (method === "Page.printToPDF") {
          return { data: Buffer.from("not-a-pdf", "utf-8").toString("base64") };
        }
        return {};
      }),
      on: vi.fn(),
    };
    const page = new Page(session as never, new Logger("error"), new AutomationEvents());
    await page.initialize();

    try {
      await expect(page.pdf({ path: output })).rejects.toThrow("PDF generation failed");
      expect(fs.existsSync(output)).toBe(false);
      expect(calls).toEqual([
        "Page.enable",
        "DOM.enable",
        "Runtime.enable",
        "Network.enable",
        "Page.setLifecycleEventsEnabled",
        "Page.getFrameTree",
        "Runtime.evaluate",
        "Emulation.setEmulatedMedia",
        "Page.printToPDF",
        "Emulation.setEmulatedMedia",
      ]);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
