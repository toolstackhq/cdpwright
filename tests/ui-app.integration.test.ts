import { describe, it, expect as vitestExpect } from "vitest";
import path from "path";
import fs from "fs";
import { pathToFileURL } from "url";
import { chromium } from "../src/index.js";
import { expect as automatonExpect } from "../src/assert/expect.js";

const runIntegration = process.env.RUN_INTEGRATION === "1";
const testFn = runIntegration ? it : it.skip;

const fixturePath = path.resolve(process.cwd(), "fixtures", "ui-app.html");

describe("ui app integration", () => {
  testFn("validates core automation features", async () => {
    const browser = await chromium.launch({
      headless: true,
      args: process.platform === "linux"
        ? ["--no-sandbox", "--no-zygote", "--disable-dev-shm-usage"]
        : []
    });
    const page = await browser.newPage();

    await page.goto(pathToFileURL(fixturePath).toString(), { allowFileUrl: true, waitUntil: "load" });

    await page.type("#customer-name", "Jane Buyer");
    await page.type("#customer-email", "jane@example.com");
    await page.type("#shipping-address", "12 Market Street");
    await page.evaluate(() => {
      const select = document.querySelector("#shipping-speed");
      if (select) {
        (select as HTMLSelectElement).value = "express";
        select.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });

    await page.type("#product-qty", "2");
    await page.click("#apply-discount");
    await automatonExpect(page).element("#discount-output").toHaveText("Discount: applied");

    await automatonExpect(page).element("#summary-total").toHaveText("Total: $74.00");

    await page.dblclick("#place-order");
    await automatonExpect(page).element("#order-status").toHaveText("Status: placed for jane@example.com");

    await page.click("#shadow-button", { pierceShadowDom: true });
    await automatonExpect(page).element("#shadow-output", { pierceShadowDom: true }).toHaveText("Shadow: clicked");

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await automatonExpect(page).element("#scroll-target").toExist();

    const artifactsDir = path.resolve(process.cwd(), "tests", "artifacts");
    fs.mkdirSync(artifactsDir, { recursive: true });
    const screenshotPath = path.join(artifactsDir, `ui-app-${Date.now()}.png`);
    await page.screenshot({ path: screenshotPath, format: "png" });
    vitestExpect(fs.existsSync(screenshotPath)).toBe(true);
    const base64 = await page.screenshotBase64({ format: "png" });
    vitestExpect(typeof base64).toBe("string");
    vitestExpect(base64.length).toBeGreaterThan(100);
    console.log(`Screenshot saved: ${screenshotPath}`);
    await browser.close();
  }, 120000);
});
