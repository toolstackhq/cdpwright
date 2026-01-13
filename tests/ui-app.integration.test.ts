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

    await page.evaluate(() => {
      const qty = document.querySelector("#product-qty");
      if (qty instanceof HTMLInputElement) {
        qty.value = "2";
        qty.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
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
    await automatonExpect(page).element(".card").toHaveCount(5);

    await automatonExpect(page).element("#summary-total").toHaveText("Total: $74.00");

    await page.dblclick("#place-order");
    await automatonExpect(page).element("#order-status").toHaveText("Status: placed for jane@example.com");

    await page.click("shadow-host >>> #shadow-button");
    await automatonExpect(page).element("shadow-host >>> #shadow-output").toHaveText("Shadow: clicked");

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

    await page.evaluate(() => {
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = "promo-optin";
      checkbox.checked = true;
      document.body.appendChild(checkbox);
    });
    await automatonExpect(page).element("#promo-optin").toBeChecked();
    await page.evaluate(() => {
      const checkbox = document.querySelector("#promo-optin");
      if (checkbox instanceof HTMLInputElement) {
        checkbox.checked = false;
      }
    });
    await automatonExpect(page).element("#promo-optin").toBeUnchecked();

    await page.evaluate(() => {
      const email = document.querySelector("#customer-email");
      if (email instanceof HTMLElement) {
        email.focus();
      }
    });
    await automatonExpect(page).element("#customer-email").toHaveFocus();
    await automatonExpect(page).element("#customer-email").toBeEditable();

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await automatonExpect(page).element("#scroll-target").toExist();
    await automatonExpect(page).element("#scroll-target").toBeInViewport();

    await page.evaluate(() => {
      const discount = document.querySelector("#discount-output");
      if (discount instanceof HTMLElement) {
        discount.style.display = "none";
      }
    });
    await automatonExpect(page).element("#discount-output").toBeHidden();

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
