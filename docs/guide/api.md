# API

## Launch

```ts
const browser = await chromium.launch({ headless: true });
```

Options:
- `headless?: boolean`
- `args?: string[]`
- `timeoutMs?: number`
- `logLevel?: "error" | "warn" | "info" | "debug" | "trace"`
- `executablePath?: string`

## Browser
- `browser.newPage()`
- `browser.close()`

## Page
- `page.goto(url, options)`
- `page.query(selector)` / `page.queryAll(selector)`
- `page.queryXPath(xpath)` / `page.queryAllXPath(xpath)`
- `page.click(selector, options)`
- `page.dblclick(selector, options)`
- `page.type(selector, text, options)`
- `page.evaluate(fnOrString, ...args)`
- `page.screenshot(options)`
- `page.screenshotBase64(options)`
- `page.frames()`
- `page.mainFrame()`
- `page.frame({ name?, urlIncludes?, predicate? })`
- `page.locator(selector, options?)`

## Frame
Frame mirrors Page for query/action methods.

## Locator
- `locator.click()`
- `locator.dblclick()`
- `locator.type(text)`
- `locator.exists()`
- `locator.text()`

## Selector routing
Selectors are automatically routed to CSS or XPath. XPath is selected when the input starts with `/`, `./`, `.//`, `..`, or `(` followed by `/` or `.`.
