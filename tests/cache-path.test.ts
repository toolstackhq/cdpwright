import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { defaultCacheRoot } from "../src/browser/Downloader.js";

const ORIGINAL_LOCALAPPDATA = process.env.LOCALAPPDATA;

describe("cache path", () => {
  beforeEach(() => {
    delete process.env.LOCALAPPDATA;
  });

  afterEach(() => {
    process.env.LOCALAPPDATA = ORIGINAL_LOCALAPPDATA;
  });

  it("uses linux cache under home", () => {
    const root = defaultCacheRoot("linux");
    expect(root).toContain("chromium-automaton");
  });

  it("uses windows local app data when set", () => {
    process.env.LOCALAPPDATA = "C:\\Users\\Test\\AppData\\Local";
    const root = defaultCacheRoot("win");
    expect(root).toContain("chromium-automaton");
    expect(root).toContain("AppData");
  });
});
