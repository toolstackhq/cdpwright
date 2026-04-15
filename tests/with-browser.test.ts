import { afterEach, describe, expect, it, vi } from "vitest";
import { ChromiumManager } from "../src/browser/ChromiumManager.js";
import { Browser } from "../src/core/Browser.js";
import { automaton } from "../src/index.js";

describe("withBrowser", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("closes the browser after the callback resolves", async () => {
    const close = vi.fn(async () => {});
    const fakeBrowser = { close } as unknown as Browser;
    const launchSpy = vi.spyOn(ChromiumManager.prototype, "launch").mockResolvedValue(fakeBrowser);

    const result = await automaton.withBrowser(async (browser) => {
      expect(browser).toBe(fakeBrowser);
      return "ok";
    });

    expect(result).toBe("ok");
    expect(close).toHaveBeenCalledTimes(1);
    expect(launchSpy).toHaveBeenCalledTimes(1);
  });

  it("closes the browser even when the callback throws", async () => {
    const close = vi.fn(async () => {});
    const fakeBrowser = { close } as unknown as Browser;
    vi.spyOn(ChromiumManager.prototype, "launch").mockResolvedValue(fakeBrowser);

    await expect(
      automaton.withBrowser(async () => {
        throw new Error("boom");
      })
    ).rejects.toThrow("boom");

    expect(close).toHaveBeenCalledTimes(1);
  });
});
