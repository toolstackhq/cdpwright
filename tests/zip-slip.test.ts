import { describe, it, expect } from "vitest";
import path from "path";
import { ensureWithinRoot } from "../src/browser/Downloader.js";

describe("zip slip protection", () => {
  it("rejects paths escaping cache", () => {
    const root = path.resolve("/tmp/cache-root");
    const target = path.resolve("/tmp/cache-root/../escape");
    expect(() => ensureWithinRoot(root, target)).toThrow();
  });

  it("allows nested paths", () => {
    const root = path.resolve("/tmp/cache-root");
    const target = path.resolve("/tmp/cache-root/dir/file");
    expect(() => ensureWithinRoot(root, target)).not.toThrow();
  });
});
