import { describe, it, expect as vitestExpect } from "vitest";
import { automaton } from "../src/index.js";
import { expect as automatonExpect } from "../src/assert/expect.js";

const runIntegration = process.env.RUN_INTEGRATION === "1";

const testFn = runIntegration ? it : it.skip;

describe("integration", () => {
  testFn("launches chromium and navigates", async () => {
    const browser = await automaton.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto("https://example.com", { waitUntil: "load" });
    await automatonExpect(page).element("h1").toHaveText(/Example Domain/);
    await browser.close();
    vitestExpect(true).toBe(true);
  }, 120000);
});
