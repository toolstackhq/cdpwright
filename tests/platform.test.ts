import { describe, it, expect } from "vitest";
import { detectPlatform } from "../src/browser/Downloader.js";

describe("platform detection", () => {
  it("maps linux", () => {
    expect(detectPlatform("linux")).toBe("linux");
  });

  it("maps mac", () => {
    expect(detectPlatform("darwin")).toBe("mac");
  });

  it("maps win", () => {
    expect(detectPlatform("win32")).toBe("win");
  });
});
