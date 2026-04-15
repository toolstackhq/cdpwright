# API Overview

The API is intentionally small. Most flows start with `chromium`, then move to `Browser`, `Page`, `Frame`, `Locator`, and `expect`.

```ts
import { chromium, expect } from "@toolstackhq/cdpwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.goto("https://example.com", { waitUntil: "load" });
await expect(page).element("h1").toHaveText(/Example Domain/);
```

## Read this in order

- [Browser](./browser.md): launch options, contexts, pages, events, and shutdown
- [Page](./page.md): navigation, actions, selectors, screenshots, and locator discovery
- [Frame](./frame.md): frame-scoped automation with the same auto-wait behavior
- [Locator](./locator.md): reusable element handles that resolve fresh on each call
- [Assertions](./assertions.md): `expect(page).element(...)` and `expect(locator)` matchers
- [Under the Hood](./under-the-hood.md): sample CDP request sequences behind the common UI actions

## Core behavior

- CSS is the default selector language
- XPath is detected from `/`, `./`, `.//`, `..`, or `(/`
- Shadow DOM selectors use `>>>`
- Actions auto-wait before they interact
- Assertions keep polling until the state matches or times out
- Missing elements count as hidden for hidden assertions

## Good defaults

If you are looking for the most stable pattern, start with:

```ts
await page.expect("button").toBeVisible();
await page.click("button");
await page.expect("#status").toHaveText("Done");
```

Then move to locators when you want a reusable handle:

```ts
const save = page.getByRole("button", { name: "Save" });
await save.click();
await page.expect(save).toBeEnabled();
```
