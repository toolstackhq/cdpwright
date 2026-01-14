import { describe, it, expect } from "vitest";
import path from "path";
import { pathToFileURL } from "url";
import { chromium } from "../src/index.js";

const runIntegration = process.env.RUN_INTEGRATION === "1";
const testFn = runIntegration ? it : it.skip;

const appPath = path.resolve(process.cwd(), "index.html");

async function waitForStep(page: any, stepId: string) {
  await page.expect(`[data-testid="step-${stepId}"]`).toBeVisible();
  await page.expect('[data-testid="loading-overlay"]').toBeHidden();
}

describe("locator finder", () => {
  testFn("generates locators for the first steps", async () => {
    let browser;
    try {
      browser = await chromium.launch({
        headless: false,
        args: process.platform === "linux" ? ["--no-sandbox", "--no-zygote", "--disable-dev-shm-usage"] : []
      });
      const page = await browser.newPage();
      await page.goto(pathToFileURL(appPath).toString(), { allowFileUrl: true, waitUntil: "load" });

      // Step 1
      await waitForStep(page, "start-eligibility");
      const first = await page.find.locators({
        highlight: true,
        outputPath: path.resolve(process.cwd(), "artifacts", "locators-start.json")
      });
      await page.screenshot({ path: path.resolve(process.cwd(), "artifacts", "locators-start.png") });
      expect(Array.isArray(first)).toBe(true);
      expect(first.length).toBeGreaterThan(0);
      expect(first.some((loc) => String(loc.css || "").includes("data-testid"))).toBe(true);

      // Move to contact details and capture again
      await page.click("#next");
      await waitForStep(page, "applicant-name-dob");
      await page.click("#next");
      await waitForStep(page, "citizenship-residency");
      await page.click("#next");
      await waitForStep(page, "passport-identity");
      await page.click("#next");
      await waitForStep(page, "contact-details");

      const contact = await page.find.locators({
        highlight: false,
        outputPath: path.resolve(process.cwd(), "artifacts", "locators-contact.json")
      });
      await page.screenshot({ path: path.resolve(process.cwd(), "artifacts", "locators-contact.png") });
      expect(contact.length).toBeGreaterThan(0);
      expect(contact.some((loc) => String(loc.name || "").toLowerCase().includes("email"))).toBe(true);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }, 120_000);
});
