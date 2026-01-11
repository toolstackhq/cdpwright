import { describe, it, expect } from "vitest";
import { parseSelector } from "../src/core/Selectors.js";

describe("selector parsing", () => {
  it("detects xpath forms", () => {
    expect(parseSelector("//div").type).toBe("xpath");
    expect(parseSelector("./div").type).toBe("xpath");
    expect(parseSelector(".//div").type).toBe("xpath");
    expect(parseSelector("..//div").type).toBe("xpath");
    expect(parseSelector(" ( /html/body ) ").type).toBe("xpath");
  });

  it("defaults to css", () => {
    expect(parseSelector("div.example").type).toBe("css");
  });
});
