# Chromium Automaton

Chromium-only automation built on the Chrome DevTools Protocol (CDP). A lightweight, Playwright-style API with `Browser`, `Context`, `Page`, `Frame`, and `Locator` primitives—no test runner included.

## Quick start

```bash
npm install @quitecode/chromium-automaton
npx chromium-automaton download    # downloads a pinned Chromium build
```

```ts
import { chromium, expect } from "@quitecode/chromium-automaton";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.goto("https://example.com");
await expect(page).element("h1").toHaveText(/Example Domain/);

await browser.close();
```

## Core ideas
- CDP-only: no WebDriver, no playwright-core dependency.
- Small surface: pages/frames/locators, plus built-in expect matchers.
- Selector routing: CSS by default; XPath if the selector starts with `/`, `./`, `.//`, `..`, or `(/`. Shadow DOM via `>>>` (e.g., `host >>> button`).
- Contexts: `browser.newContext()` gives incognito-style isolation without launching a new browser.
- Downloads: `npx chromium-automaton download` (or `--latest`) fetches Chromium into a local cache.

## Key APIs
- `chromium.launch(options)` → `Browser`
- `browser.newContext()` → isolated `BrowserContext`
- `browser.newPage()` / `context.newPage()` → `Page`
- `page.goto(url, { waitUntil: "load" | "domcontentloaded" })`
- Actions: `click`, `dblclick`, `type`, `typeSecure`, `fillInput`, `selectOption`, `setFileInput`
- Queries: `query`, `queryAll`, `queryXPath`, `queryAllXPath`, `locator`
- Assertions: `expect(page).element("selector").toBeVisible()` (see `docs/guide/assertions.md`)

## Docs
Full guide and API reference: https://quitecode9-lab.github.io/chromium-automation/ (built from `docs/` via VitePress). Start at `docs/guide/intro.md` or `docs/guide/api/`.

## Demo app
`index.html` is a local, data-driven visa-style wizard used to stress-test automation flows (no server required). Open it directly via `file://` to exercise navigation, conditionals, overlays, Shadow DOM, uploads, and receipts.

## License
MIT
