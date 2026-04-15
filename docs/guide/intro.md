# Introduction

`cdpwright` is a Chromium-only browser automation library built directly on CDP. It is designed for scripts, automation flows, and test suites that want Playwright-style ergonomics without the multi-browser runtime or framework baggage.

## The mental model

```ts
import { chromium } from "@toolstackhq/cdpwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.goto("https://example.com", { waitUntil: "load" });
await page.expect("h1").toHaveText(/Example Domain/);

await browser.close();
```

- `chromium` is the entry point
- `Browser` owns a live Chromium session
- `Page`, `Frame`, and `Locator` expose the actions you actually use
- `expect(...)` adds auto-waiting assertions

## What makes it feel fast

- Actions wait for targets to exist and become actionable
- Assertions retry until the page reaches the expected state
- Locators are resolved fresh on each call, so DOM updates do not stale them
- Chromium is fetched separately with `cpw install`, so the npm package itself stays small

## What it is good at

- Reliable test automation on Chromium
- Scripts that need structured browser control
- Projects that already have their own test runner
- Scaffolding a starter suite for Vitest, Mocha, or Node's built-in runner

## What it does not try to be

- A full cross-browser runner
- A reporting framework
- A recording UI
- A replacement for Playwright Test

## Recommended path

1. Install the package and browser once.
2. Use `chromium.withBrowser()` for plain scripts.
3. Use `cpw init test <runner>` when you want a starter suite.
4. Read the [Page API](./api/page.md) and [Assertions](./api/assertions.md) next.

## Next steps

- [Getting Started](./getting-started)
- [CLI](./cli)
- [API Overview](./api/)
