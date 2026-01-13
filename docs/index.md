---
layout: home
hero:
  name: Chromium Automaton
  text: Lightweight Chromium-only automation
  tagline: CDP-powered, Playwright-style API without the framework baggage.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: API Reference
      link: /guide/api
---

## What it is
- Chromium-only browser automation built on the Chrome DevTools Protocol
- Small API surface with Page, Frame, and Locator primitives
- Action and assertion logging with simple opt-out

## What it is not
- Not a test runner or framework
- Not multi-browser
- Not a reporting system

## Quick Example

```ts
import { chromium, expect } from "@quitecode/chromium-automaton";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.goto("https://example.com");
await expect(page).element("h1").toHaveText(/Example Domain/);

await browser.close();
```
