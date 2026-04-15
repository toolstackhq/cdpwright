import { describe, it, expect as vitestExpect } from "vitest";
import path from "path";
import fs from "fs";
import { pathToFileURL } from "url";
import { chromium } from "../src/index.js";
import { expect as automatonExpect } from "../src/assert/expect.js";

const runIntegration = process.env.RUN_INTEGRATION === "1";
const testFn = runIntegration ? it : it.skip;

const fixturePath = path.resolve(process.cwd(), "fixtures", "ui-app.html");
const artifactsDir = path.resolve(process.cwd(), "tests", "artifacts");

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

    const customerName = page.locator("#customer-name");
    const customerEmail = page.locator("#customer-email");
    const shippingAddress = page.locator("#shipping-address");
    const quantity = page.locator("#product-qty");
    const note = page.locator("#product-note");
    const promoOptin = page.locator("#promo-optin");
    const receiptFile = page.locator("#receipt-file");

    await customerName.fill("Jane Buyer");
    await customerEmail.fill("jane@example.com");
    await shippingAddress.fill("12 Market Street");
    await quantity.fill("2");
    await note.fill("Gift note");
    await note.clear();

    await page.selectOption("#shipping-speed", "express");
    await page.click("#apply-discount");
    await automatonExpect(page).element("#discount-output").toHaveText("Discount: applied");
    await automatonExpect(page).element("#customer-name").toHaveValue("Jane Buyer");
    await automatonExpect(page).element("#customer-email").toHaveAttribute("placeholder", "jane@shop.test");
    await automatonExpect(page).element("#order-title").toHaveExactText("Purchase Order");
    await automatonExpect(page).element("#summary-total").toContainText("Total:");
    await automatonExpect(page).element("#apply-discount").toBeEnabled();

    await page.evaluate(() => {
      const email = document.querySelector("#customer-email");
      if (email) {
        email.setAttribute("name", "email");
      }
      const toggle = document.querySelector("#toggle-theme");
      if (toggle) {
        toggle.setAttribute("disabled", "true");
      }
      const themeCard = document.querySelector("#theme-card");
      if (themeCard instanceof HTMLElement) {
        themeCard.style.backgroundColor = "rgb(10, 10, 10)";
      }
    });
    await automatonExpect(page).element("#customer-email").toHaveName("email");
    await automatonExpect(page).element("#toggle-theme").toBeDisabled();
    await automatonExpect(page).element("#theme-card").toHaveClass("theme-light");
    await automatonExpect(page).element("#theme-card").toHaveClasses(["card", "theme-light"]);
    await automatonExpect(page).element("#theme-card").toHaveCss("background-color", "rgb(10, 10, 10)");
    await automatonExpect(page).element(".card").toHaveCount(6);

    await automatonExpect(page).element("#summary-total").toHaveText("Total: $74.00");

    await page.focus("#customer-email");
    await page.press("#customer-email", "Tab");
    await automatonExpect(page).element("#shipping-address").toHaveFocus();
    await customerName.selectText();
    const selectedRange = await page.evaluate(() => {
      const input = document.querySelector("#customer-name");
      if (!(input instanceof HTMLInputElement)) {
        return null;
      }
      return [input.selectionStart, input.selectionEnd];
    });
    vitestExpect(selectedRange).toEqual([0, "Jane Buyer".length]);

    await page.dblclick("#place-order");
    await automatonExpect(page).element("#order-status").toHaveText("Status: placed for jane@example.com");

    await page.hover("#hover-target");
    await automatonExpect(page).element("#hover-output").toHaveText("Hover: active");

    await promoOptin.check();
    await automatonExpect(page).element("#promo-status").toHaveText("Promo: on");
    await promoOptin.uncheck();
    await automatonExpect(page).element("#promo-status").toHaveText("Promo: off");
    await promoOptin.setChecked(true);
    await automatonExpect(page).element("#promo-optin").toBeChecked();
    await promoOptin.setChecked(false);
    await automatonExpect(page).element("#promo-optin").toBeUnchecked();

    await receiptFile.setInputFiles({
      name: "receipt.txt",
      contents: "receipt data",
      mimeType: "text/plain"
    });
    await automatonExpect(page).element("#receipt-status").toHaveText("Receipt: receipt.txt");

    await page.click("#shadow-host >>> #shadow-button");
    await automatonExpect(page).element("#shadow-host >>> #shadow-output").toHaveText("Shadow: clicked");

    await page.evaluate(() => {
      const input = document.createElement("input");
      input.id = "secure-input";
      document.body.appendChild(input);
      const output = document.createElement("p");
      output.id = "secure-text";
      output.textContent = "token: abc123";
      document.body.appendChild(output);
    });
    await page.typeSecure("#secure-input", "secret-value");
    const secureValue = await page.valueSecure("#secure-input");
    vitestExpect(secureValue).toBe("secret-value");
    const secureText = await page.textSecure("#secure-text");
    vitestExpect(secureText).toBe("token: abc123");

    await automatonExpect(page).element("#customer-email").toBeEditable();
    await page.scrollIntoViewIfNeeded("#scroll-target");
    await automatonExpect(page).element("#scroll-target").toExist();
    await automatonExpect(page).element("#scroll-target").toBeInViewport();

    await page.clear("#product-note");
    vitestExpect(await page.evaluate(() => {
      const input = document.querySelector("#product-note");
      return input instanceof HTMLInputElement ? input.value : null;
    })).toBe("");

    await page.evaluate(() => {
      const discount = document.querySelector("#discount-output");
      if (discount instanceof HTMLElement) {
        discount.style.display = "none";
      }
    });
    await automatonExpect(page).element("#discount-output").toBeHidden();

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
