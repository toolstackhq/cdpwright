import { automaton, expect } from "@quitecode/chromium-automaton";

const browser = await automaton.launch({
  headless: false,
  args: [
    "--no-sandbox",
    "--disable-crash-reporter",
    "--no-zygote",
    "--disable-dev-shm-usage"
  ]
});

const page = await browser.newPage();

await page.goto("https://example.com", { waitUntil: "load" });
await page.screenshot({ path: "./example.png", format: "png" });
await expect(page).element("h1").toHaveText(/Example Domain/);

await browser.close();
