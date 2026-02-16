# Getting Started

## Install

```bash
npm install @automation01/chromium-automaton
```

## Download Chromium

```bash
npx ca download
npx ca download --latest
```

## Launch and navigate

Create a quick script (e.g. `index.js`) and run it with:

```bash
node index.js
```

```js
import { chromium } from "@automation01/chromium-automaton";

async function main() {
  const browser = await chromium.launch({ headless: true, logEvents: true });
  const page = await browser.newPage();

  await page.goto("https://example.com", { waitUntil: "load" });
  await page.expect("h1").toHaveText(/Example Domain/);

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```
