import { describe, it, expect } from "vitest";
import { ensureAllowedUrl } from "../src/core/UrlGuard.js";

describe("URL validation", () => {
  it("allows http and https", () => {
    expect(() => ensureAllowedUrl("https://example.com")).not.toThrow();
    expect(() => ensureAllowedUrl("http://example.com")).not.toThrow();
  });

  it("blocks file by default", () => {
    expect(() => ensureAllowedUrl("file:///tmp/index.html")).toThrow();
  });

  it("allows file when enabled", () => {
    expect(() => ensureAllowedUrl("file:///tmp/index.html", { allowFileUrl: true })).not.toThrow();
  });
});
