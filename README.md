# cdpwright

Chromium-only automation built on the Chrome DevTools Protocol (CDP). A lightweight, Playwright-style API with `Browser`, `Context`, `Page`, `Frame`, and `Locator` primitives—no test runner included.

## Quick start

```bash
mkdir my-project && cd my-project
npm init -y
npm install @toolstackhq/cdpwright
npx cpw download    # downloads a pinned Chromium build
```

Create `quick.mjs` (the `.mjs` extension enables ES modules — no config needed):

```js
// quick.mjs
import { chromium, expect } from "@toolstackhq/cdpwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.goto("https://example.com");
await expect(page).element("h1").toHaveText(/Example Domain/);

await browser.close();
```

Run it:
```bash
node quick.mjs
```

> **Tip:** If you prefer `.js` files, add `"type": "module"` to your `package.json`.
> For TypeScript, just rename to `quick.ts` and run with `tsx quick.ts` or `npx ts-node --esm quick.ts`.

## Core ideas
- CDP-only: no WebDriver, no playwright-core dependency.
- Small surface: pages/frames/locators, plus built-in expect matchers.
- Selector routing: CSS by default; XPath if the selector starts with `/`, `./`, `.//`, `..`, or `(/`. Shadow DOM via `>>>` (e.g., `host >>> button`).
- Contexts: `browser.newContext()` gives incognito-style isolation without launching a new browser.
- Downloads: `npx cpw download` (or `--latest`) fetches Chromium into a local cache.

## Key APIs
- `chromium.launch(options)` → `Browser`
- `browser.newContext()` → isolated `BrowserContext`
- `browser.newPage()` / `context.newPage()` → `Page`
- `page.goto(url, { waitUntil: "load" | "domcontentloaded" })`
- Actions: `click`, `dblclick`, `type`, `typeSecure`, `fillInput`, `selectOption`, `setFileInput`
- Queries: `query`, `queryAll`, `queryXPath`, `queryAllXPath`, `locator`
- Assertions: `expect(page).element("selector").toBeVisible()` (see `docs/guide/assertions.md`)

## Architecture

```mermaid
graph TD
    subgraph CLI
        CPW["cpw (CLI)"]
    end

    subgraph Library API
        USER["User code"] -->|chromium.launch| MGR[ChromiumManager]
        MGR -->|spawns| PROC[Chromium process]
        PROC -->|WebSocket| CDP[CDP Session]
        CDP --> BROWSER[Browser]
        BROWSER --> CTX[BrowserContext]
        CTX --> PAGE[Page]
        PAGE --> FRAME[Frame]
        FRAME --> LOC[Locator]
        PAGE --> EXPECT["expect()"]
    end

    subgraph Download
        CPW -->|cpw download| DL[Downloader]
        DL -->|fetch + extract| CACHE["~/.cache/cdpwright"]
        MGR -.->|resolve executable| CACHE
    end
```

## Docs
Full guide and API reference: https://toolstackhq.github.io/cdpwright/ (built from `docs/` via VitePress). Start at `docs/guide/intro.md` or `docs/guide/api/`.

## Demo app
`index.html` is a local, data-driven visa-style wizard used to stress-test automation flows (no server required). Open it directly via `file://` to exercise navigation, conditionals, overlays, Shadow DOM, uploads, and receipts.

## License
MIT
