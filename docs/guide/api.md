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
- `logEvents?: boolean`
- `executablePath?: string`

- `maximize?: boolean`
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
- `page.typeSecure(selector, text, options)`
- `page.evaluate(fnOrString, ...args)`
- `page.textSecure(selector, options)`
- `page.valueSecure(selector, options)`
- `page.screenshot(options)`
- `page.screenshotBase64(options)`
- `page.frames()`
- `page.mainFrame()`
- `page.frame({ name?, urlIncludes?, predicate? })`
- `page.locator(selector, options?)`

## Frame
Frame mirrors Page for query/action methods, including `typeSecure`, `textSecure`, and `valueSecure`.

## Locator
- `locator.click()`
- `locator.dblclick()`
- `locator.type(text)`
- `locator.exists()`
- `locator.text()`

## Assertions
```ts
import { expect } from "@quitecode/chromium-automaton";

await expect(page).element("#status").toBeVisible();
```

Common assertions:
- `toExist()` / `not.toExist()`
- `toBeVisible()` / `toBeHidden()`
- `toBeEnabled()` / `toBeDisabled()`
- `toBeChecked()` / `toBeUnchecked()`
- `toBeEditable()`
- `toHaveText(textOrRegex)`
- `toHaveExactText(textOrRegex)`
- `toContainText(textOrRegex)`
- `toHaveValue(valueOrRegex)`
- `toHaveAttribute(name, valueOrRegex?)`
- `toHaveId(idOrRegex)`
- `toHaveName(nameOrRegex)`
- `toHaveCount(count)`
- `toHaveClass(nameOrRegex)`
- `toHaveClasses(names)`
- `toHaveCss(property, valueOrRegex)`
- `toHaveFocus()`
- `toBeInViewport({ fully?: boolean })`

## Selector routing
Selectors are automatically routed to CSS or XPath. XPath is selected when the input starts with `/`, `./`, `.//`, `..`, or `(` followed by `/` or `.`.
