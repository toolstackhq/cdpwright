# Getting Started

## Install

```bash
npm install @quitecode/chromium-automaton
```

## Download Chromium

```bash
npx chromium-automaton download
npx chromium-automaton download --latest
```

## Launch and navigate

Create a quick script (e.g. `index.js`) and run it with `node index.js`:

```js
import { chromium } from "@quitecode/chromium-automaton";

async function main() {
  const browser = await chromium.launch({ headless: true, logEvents: true });
  const page = await browser.newPage();

  await page.goto("https://example.com", { waitUntil: "load" });
  await page.expect("h1").toHaveText(/Example Domain/);

  await page.type("#query", "hello world");
  await page.click("#search");

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```
