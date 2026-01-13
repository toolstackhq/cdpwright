# Browser API

Work with the top-level browser, contexts, and pages.

## Launch

```ts
import { chromium } from "@quitecode/chromium-automaton";

const browser = await chromium.launch({
  headless: false,          // default is true
  maximize: true,           // adds --start-maximized
  args: process.platform === "linux" ? ["--no-sandbox"] : []
});
```

Options:
- `headless` (default `true`)
- `maximize` adds the Chromium flag `--start-maximized`
- `args` extra Chromium flags
- `timeoutMs` for startup
- `logLevel`, `logEvents`, `logActions`, `logAssertions`
- `userDataDir` to reuse a profile; defaults to an isolated temp profile per launch
- `executablePath` to point at an existing Chromium build

## Contexts

```ts
const context = await browser.newContext(); // fresh incognito-style profile
const page = await context.newPage();
```

Contexts isolate cookies, storage, and tabs. Closing a context disposes its pages.

## Pages

```ts
const page = await browser.newPage(); // uses the default context
await page.goto("https://example.com");
```

Use additional pages to run tabs in parallel within the same profile.

## Close

```ts
await browser.close(); // shuts down all contexts and Chromium
```
