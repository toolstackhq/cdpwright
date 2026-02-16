import { describe, it, expect, vi } from "vitest";
import { attachAllure } from "../src/adapters/allure.js";
import { AutomationEvents } from "../src/core/Events.js";

describe("allure adapter", () => {
  it("uses assertion status when ending steps", () => {
    const events = new AutomationEvents();
    const browser = {
      on: events.on.bind(events)
    } as any;

    const allure = {
      startStep: vi.fn(),
      endStep: vi.fn()
    };

    attachAllure(browser, allure);
    events.emit("assertion:start", { name: "check", selector: "#x" });
    events.emit("assertion:end", { name: "check", selector: "#x", status: "failed" });

    expect(allure.startStep).toHaveBeenCalledWith("check #x");
    expect(allure.endStep).toHaveBeenCalledWith("failed");
  });
});
