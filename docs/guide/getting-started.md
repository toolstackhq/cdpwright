# Getting Started

## Install

```bash
npm install @toolstackhq/cdpwright
```

## Install Chromium once

```bash
npx cpw install
npx cpw install --latest
```

If you are working from a source checkout, run `npm run build` first and then `npm run browser:install`.

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

If you want the browser to close automatically when the callback finishes, use `chromium.withBrowser()`:

```js
// index.mjs
import { chromium } from "@toolstackhq/cdpwright";

await chromium.withBrowser({ headless: true, logEvents: true }, async (browser) => {
  const page = await browser.newPage();

  await page.goto("https://example.com", { waitUntil: "load" });
  await page.expect("h1").toHaveText(/Example Domain/);
});
```

> **Tip:** If you prefer `.js` files, add `"type": "module"` to your `package.json`.
> For TypeScript, rename to `index.ts` and run with `tsx index.ts`.
