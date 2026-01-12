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

```ts
import { chromium, expect } from "@quitecode/chromium-automaton";

const browser = await chromium.launch({ headless: true, logEvents: true });
const page = await browser.newPage();

await page.goto("https://example.com", { waitUntil: "load" });
await expect(page).element("h1").toHaveText(/Example Domain/);

await page.typeSecure("#password", "super-secret");

await browser.close();
```
