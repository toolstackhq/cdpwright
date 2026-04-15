# Assertions

Use the built-in `expect` helpers to assert against elements.

```ts
import { expect } from "@toolstackhq/cdpwright";

await expect(page).element(".ready").toExist();
await page.expect("#submit").toBeVisible();        // convenience on Page
await page.expect().element("h1").toHaveText(/Visa Application/);
await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
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

Assertions poll until the requested state is true or the timeout expires. `toBeHidden()` treats a missing element as hidden, which matches the auto-wait behavior used throughout the element APIs.

```ts
await page.expect("#submit").toBeVisible();
await page.expect("#loading").toBeHidden();
await page.expect(page.getByText("Saved")).toBeVisible();
await page.expect(page.getByText("Missing toast")).toBeHidden();
```

See the dedicated [Assertions guide](/guide/assertions) for the full matcher list and examples.
