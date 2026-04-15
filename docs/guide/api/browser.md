# Browser API

Use `Browser` when you want to control the Chromium lifecycle directly: launch, isolate storage, open tabs, and shut everything down in one place.

## When to use this

- You are writing a script and want explicit lifecycle control
- You need multiple isolated contexts in one browser process
- You want to listen to action or assertion events
- You want to reuse a profile or point at a specific Chromium executable

## Launch Chromium

```ts
import { chromium } from "@toolstackhq/cdpwright";

const browser = await chromium.launch({
  headless: true,
  maximize: false,
  args: process.platform === "linux" ? ["--no-sandbox", "--no-zygote", "--disable-dev-shm-usage"] : [],
});
```

Common launch options:
- `headless` defaults to `true`
- `maximize` adds `--start-maximized` and a desktop-sized window
- `args` appends extra Chromium flags
- `timeoutMs` controls browser startup timeout
- `logLevel`, `logEvents`, `logActions`, `logAssertions` control logging
- `userDataDir` reuses a profile instead of a temp directory
- `executablePath` points to an existing Chromium binary

## Prefer `withBrowser()` for scripts

If you do not need manual lifecycle control, `chromium.withBrowser()` is the cleaner option:

```ts
import { chromium } from "@toolstackhq/cdpwright";

await chromium.withBrowser({ headless: true }, async (browser) => {
  const page = await browser.newPage();
  await page.goto("https://example.com", { waitUntil: "load" });
});
```

## Contexts

Use contexts when you want separate cookies, storage, or tabs inside the same browser process.

```ts
const context = await browser.newContext();
const page = await context.newPage();
```

Closing a context disposes all of its pages.

## Pages

The default browser page uses the browser's main context:

```ts
const page = await browser.newPage();
await page.goto("https://example.com");
```

Open multiple pages when you want parallel tabs under the same session.

## Events

Listen to browser events when you want lightweight telemetry:

```ts
browser.on("action:end", (event) => {
  console.log(event.name, event.selector, event.durationMs);
});

browser.on("assertion:end", (event) => {
  console.log(event.name, event.status); // "passed" | "failed"
});
```

Supported events:
- `action:start`
- `action:end`
- `assertion:start`
- `assertion:end`

## Close

Always close the browser when you manage lifecycle yourself:

```ts
await browser.close();
```

That shuts down all contexts and Chromium.
