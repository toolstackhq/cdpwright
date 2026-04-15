# Assertions

Use the built-in `expect` helpers when you want stable, auto-waiting assertions against elements or locators.

## The two entry points

```ts
import { expect } from "@toolstackhq/cdpwright";

await expect(page).element(".ready").toExist();
await page.expect("#submit").toBeVisible(); // convenience on Page
```

You can also assert against locators:

```ts
await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
await page.expect(page.getByText("Saved")).toBeVisible();
```

## Common matchers

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

## How waiting works

Assertions poll until the requested state is true or the timeout expires. That means they are safe for dynamic pages that render after fetches, animations, or navigation.

`toBeHidden()` treats a missing element as hidden, which matches the rest of the auto-wait behavior in `cdpwright`.

```ts
await page.expect("#submit").toBeVisible();
await page.expect("#loading").toBeHidden();
await page.expect(page.getByText("Saved")).toBeVisible();
await page.expect(page.getByText("Missing toast")).toBeHidden();
```

## Good patterns

Use `expect(page).element(...)` when you want the full matcher surface:

```ts
await expect(page).element("#email").toHaveValue("user@acme.test");
await expect(page).element(".card").toHaveCount(3);
await expect(page).element("#theme").toHaveCss("background-color", "rgb(10, 10, 10)");
```

Use `page.expect(...)` when you want the concise convenience form:

```ts
await page.expect("#submit").toBeEnabled();
await page.expect(page.getByText("Ready")).toBeVisible();
```

See the dedicated [Assertions guide](/guide/assertions) for the full matcher list and examples.
