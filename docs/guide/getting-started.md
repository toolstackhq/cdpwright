# Getting Started

## Install

```bash
npm install @toolstackhq/cdpwright
```

## Download Chromium

```bash
npx cpw download
npx cpw download --latest
```

## Launch and navigate

Create `index.mjs` (the `.mjs` extension enables ES modules — no config needed):

```js
// index.mjs
import { chromium } from "@toolstackhq/cdpwright";

const browser = await chromium.launch({ headless: true, logEvents: true });
const page = await browser.newPage();

await page.goto("https://example.com", { waitUntil: "load" });
await page.expect("h1").toHaveText(/Example Domain/);

await browser.close();
```

```bash
node index.mjs
```

> **Tip:** If you prefer `.js` files, add `"type": "module"` to your `package.json`.
> For TypeScript, rename to `index.ts` and run with `tsx index.ts`.
