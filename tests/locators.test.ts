import { describe, expect as vitestExpect, it, vi } from "vitest";
import { Page } from "../src/core/Page.js";
import { Logger } from "../src/logging/Logger.js";
import { AutomationEvents } from "../src/core/Events.js";
import { expect as automatonExpect } from "../src/assert/expect.js";

function createPageSession() {
  const calls: Array<{ method: string; params?: Record<string, unknown> }> = [];
  const session = {
    send: vi.fn(async (method: string, params?: Record<string, unknown>) => {
      calls.push({ method, params });
      if (method === "Page.getFrameTree") {
        return { frameTree: { frame: { id: "main", url: "https://example.com" } } };
      }
      if (method === "Runtime.evaluate") {
        const expression = String(params?.expression ?? "");
        if (expression === "document.readyState") {
          return { result: { value: "complete" } };
        }
        if (expression.includes('"kind":"role"')) {
          return { result: { value: { x: 20, y: 30, width: 120, height: 40, visible: true } } };
        }
        if (expression.includes('"kind":"text"')) {
          return { result: { value: true } };
        }
      }
      return {};
    }),
    on: vi.fn()
  };
  return { session, calls };
}

describe("role and text locators", () => {
  it("clicks by role and asserts visibility by text", async () => {
    const { session, calls } = createPageSession();
    const page = new Page(session as never, new Logger("error"), new AutomationEvents());
    await page.initialize();

    await page.getByRole("button", { name: "Sign in" }).click();
    await automatonExpect(page.getByText("Welcome, John!")).toBeVisible();

    vitestExpect(calls.some((call) => call.method === "Runtime.evaluate" && String(call.params?.expression).includes('"kind":"role"'))).toBe(true);
    vitestExpect(calls.some((call) => call.method === "Runtime.evaluate" && String(call.params?.expression).includes('"kind":"text"'))).toBe(true);
    vitestExpect(calls.filter((call) => call.method === "Input.dispatchMouseEvent").length).toBeGreaterThan(0);
  });
});
