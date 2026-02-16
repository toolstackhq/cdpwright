import { describe, it, expect } from "vitest";
import { Frame } from "../src/core/Frame.js";
import { Logger } from "../src/logging/Logger.js";
import { AutomationEvents } from "../src/core/Events.js";

describe("frame text selector handling", () => {
  it("uses XPath evaluation for XPath selectors", async () => {
    let expression = "";
    const session = {
      send: async (method: string, params: Record<string, unknown>) => {
        if (method === "Runtime.evaluate") {
          expression = String(params.expression ?? "");
          return { result: { value: "ok" } };
        }
        return {};
      }
    } as any;

    const frame = new Frame("frame-1", session, new Logger("error"), new AutomationEvents());
    await frame.text("//h1");

    expect(expression).toContain("document.evaluate");
  });

  it("uses deep selector helpers for shadow selectors", async () => {
    let expression = "";
    const session = {
      send: async (method: string, params: Record<string, unknown>) => {
        if (method === "Runtime.evaluate") {
          expression = String(params.expression ?? "");
          return { result: { value: "ok" } };
        }
        return {};
      }
    } as any;

    const frame = new Frame("frame-1", session, new Logger("error"), new AutomationEvents());
    await frame.text("host-el >>> .value");

    expect(expression).toContain("querySelectorDeep");
  });

  it("honors explicit pierceShadowDom option", async () => {
    let expression = "";
    const session = {
      send: async (method: string, params: Record<string, unknown>) => {
        if (method === "Runtime.evaluate") {
          expression = String(params.expression ?? "");
          return { result: { value: "ok" } };
        }
        return {};
      }
    } as any;

    const frame = new Frame("frame-1", session, new Logger("error"), new AutomationEvents());
    await frame.text(".value", { pierceShadowDom: true });

    expect(expression).toContain("querySelectorDeep");
  });
});
