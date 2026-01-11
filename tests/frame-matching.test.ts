import { describe, it, expect } from "vitest";
import { Page } from "../src/core/Page.js";
import { Frame } from "../src/core/Frame.js";
import { Logger } from "../src/logging/Logger.js";
import { AutomationEvents } from "../src/core/Events.js";

const fakeSession = {
  send: async () => ({}),
  on: () => {}
} as any;

describe("frame matching", () => {
  it("matches by name and url", () => {
    const page = new Page(fakeSession, new Logger("error"), new AutomationEvents());
    const frameA = new Frame("frame-a", fakeSession, new Logger("error"), new AutomationEvents());
    frameA.setMeta({ name: "main", url: "https://example.com" });
    const frameB = new Frame("frame-b", fakeSession, new Logger("error"), new AutomationEvents());
    frameB.setMeta({ name: "child", url: "https://example.com/child" });

    (page as any).framesById = new Map([
      ["frame-a", frameA],
      ["frame-b", frameB]
    ]);
    (page as any).mainFrameId = "frame-a";

    expect(page.frame({ name: "child" })?.id).toBe("frame-b");
    expect(page.frame({ urlIncludes: "example.com" })?.id).toBe("frame-a");
    expect(page.frame({ predicate: (frame) => frame.id === "frame-b" })?.id).toBe("frame-b");
  });
});
