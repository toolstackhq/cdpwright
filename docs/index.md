---
layout: home
hero:
  name: cdpwright
  text: Chromium automation with a lighter footprint
  tagline: Playwright-style ergonomics for CDP scripts, test suites, and browser workflows. Small npm package, explicit browser install, auto-waiting primitives, and a clean CLI.
  actions:
    - theme: brand
      text: Get started
      link: /guide/getting-started
    - theme: alt
      text: Read the API
      link: /guide/api/
    - theme: alt
      text: Scaffold tests
      link: /guide/cli#cpw-init-test-runner
features:
  - title: Auto-waiting
    details: "Actions and assertions wait for elements to appear or settle before they run, so tests read like intent instead of timing code."
  - title: Lifecycle helper
    details: "chromium.withBrowser() launches Chromium, runs your callback, and closes the browser automatically when you are done."
  - title: Framework-neutral scaffolds
    details: "cpw init test vitest|mocha|node creates a runnable starter suite, local fixture, and npm test script in your project."
  - title: Install once, run many
    details: "cpw install prewarms Chromium into a local cache, which keeps scripts and CI runs simple and predictable."
  - title: Shadow DOM and frames
    details: "Selectors, frames, and locators all work together, including shadow-piercing selectors and reusable locator handles."
  - title: Lightweight package
    details: "The published npm package stays small; Chromium is fetched separately so you only pay for the browser binary when you need it."
---

## Why this exists

`cdpwright` is built for teams that want Playwright-style browser automation without taking the whole multi-browser framework with them.

- Chromium only, via CDP
- Small API surface
- First-class locators and assertions
- Scripts, tests, and CLI commands share the same launch model

## The fast path

```bash
npm init -y
npm install @toolstackhq/cdpwright
npx cpw install
```

```js
import { chromium, expect } from "@toolstackhq/cdpwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.goto("https://example.com", { waitUntil: "load" });
await expect(page).element("h1").toHaveText(/Example Domain/);

await browser.close();
```

## Playwright-style scripts

For standalone scripts, `chromium.withBrowser()` keeps the lifecycle tidy:

```js
import { chromium } from "@toolstackhq/cdpwright";

await chromium.withBrowser({ headless: true, logEvents: true }, async (browser) => {
  const page = await browser.newPage();
  await page.goto("https://toolstackhq.github.io/bluledger/login", { waitUntil: "load" });
  await page.type("#customerId", "92718463");
  await page.typeSecure("#password", "Harbour!92");
  await page.click("#login-submit-button");
  await page.expect("#dashboard-transfer-money-link").toBeVisible();
});
```

## Scaffold a runner

If you want a test suite generated for the framework you already use, scaffold one after `npm init -y`:

```bash
npx cpw init test vitest
npx cpw init test mocha
npx cpw init test node
```

The scaffold writes a starter test, a local HTML fixture, and an `npm test` script. Vitest templates use the package's own assertion helper as `cdpExpect`, while Mocha and Node's built-in runner use `assert`.

## What to read next

- [Getting Started](/guide/getting-started)
- [CLI](/guide/cli)
- [Browser API](/guide/api/browser)
- [Page API](/guide/api/page)
- [Locator API](/guide/api/locator)
- [Assertions](/guide/api/assertions)
- [Scaffold overview](/guide/cli#cpw-init-test-runner)

## Design goals

- Keep the runtime small and explicit
- Make tests less flaky with built-in waiting
- Keep the CLI useful for both humans and agents
- Stay easy to embed in existing Node projects
