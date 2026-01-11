# Chromium Automaton

[![ci](https://github.com/quitecode9-lab/chromium-automation/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/quitecode9-lab/chromium-automation/actions/workflows/ci.yml)

Chromium Automaton is a lightweight, Chromium-only browser automation library built directly on the Chrome DevTools Protocol (CDP). It offers a Playwright-style API without bundling any runner, fixtures, or reporting.

## What it is
- A small CDP client with a focused API for Chromium automation
- A CLI for downloading and caching Chromium snapshots
- Runner-agnostic assertions you can plug into any test setup

## What it is not
- Not a framework, runner, or test harness
- Not multi-browser (Chromium only)
- Not a report generator (no built-in reporting)

## Install

```bash
npm install @quitecode/chromium-automaton
```

## Download Chromium

```bash
npx chromium-automaton download
npx chromium-automaton download --latest
```

## Usage

```ts
import { chromium, expect } from "@quitecode/chromium-automaton";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.goto("https://example.com", { waitUntil: "load" });
await page.click("h1");
const screenshotBase64 = await page.screenshotBase64();

await expect(page).element("h1").toHaveText(/Example Domain/);

await browser.close();
```

## Architecture

```mermaid
graph LR
  CLI[CLI: chromium-automaton download] --> Downloader[Downloader]
  Downloader --> Cache[Chromium Cache]
  User[User Code] --> API[chromium.launch]
  API --> Manager[ChromiumManager]
  Manager --> Chromium[Chromium Process]
  Manager --> Conn[CDP Connection]
  Conn --> Browser[Browser]
  Browser --> Page[Page]
  Page --> Frame[Frame]
  Page --> Locator[Locator]
  Page --> Expect[expect()]
```

## Locators

```ts
const locator = page.locator("#login", { pierceShadowDom: true });
await locator.click();
await locator.type("admin");
```

## Frames

```ts
const frame = page.frame({ urlIncludes: "embedded" });
if (frame) {
  await frame.click("button.submit");
}
```

## Shadow DOM

```ts
await page.click("button.action", { pierceShadowDom: true });
const text = await page.evaluate(() => document.title);
```

## Assertions

```ts
await expect(page).element(".ready").toExist();
await expect(page).element(".hidden").not.toBeVisible();
await expect(page).element("h1").toHaveText("Example Domain");
```

## Environment configuration
- `CHROMIUM_AUTOMATON_CACHE_DIR`: override cache root
- `CHROMIUM_AUTOMATON_REVISION`: override pinned revision
- `CHROMIUM_AUTOMATON_EXECUTABLE_PATH`: bypass download and use this executable
- `CHROMIUM_AUTOMATON_LOG_LEVEL`: error, warn, info, debug, trace

Default cache root:
- Linux and macOS: `~/.cache/chromium-automaton`
- Windows: `%LOCALAPPDATA%\chromium-automaton`

## Limitations
- Chromium only (no Chrome, Firefox, WebKit)
- XPath selectors do not pierce shadow DOM
- `evaluate(string)` is unsafe if the string includes untrusted input
- Only http/https are allowed in `goto` unless `allowFileUrl` is true

## ESM
This package is ESM-only. Use `import` syntax in Node 18+.
