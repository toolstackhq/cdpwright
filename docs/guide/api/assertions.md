# Assertions

Use the built-in `expect` helpers to assert against elements.

```ts
import { expect } from "@quitecode/chromium-automaton";

await expect(page).element(".ready").toExist();
await page.expect("#submit").toBeVisible();        // convenience on Page
await page.expect().element("h1").toHaveText(/Visa Application/);
```

Common matchers:
- `toExist()` / `not.toExist()`
- `toBeVisible()` / `toBeHidden()`
- `toBeEnabled()` / `toBeDisabled()`
- `toBeChecked()` / `toBeUnchecked()`
- `toHaveText(textOrRegex)` / `toContainText(textOrRegex)`
- `toHaveValue(valueOrRegex)`
- `toHaveAttribute(name, valueOrRegex?)`
- `toHaveCount(count)`
- `toHaveClass(nameOrRegex)` / `toHaveClasses(names)`
- `toHaveCss(property, valueOrRegex)`
- `toHaveFocus()` / `toBeInViewport({ fully?: boolean })`

See the dedicated [Assertions guide](/guide/assertions) for the full matcher list and examples.
