# Assertions

```ts
import { expect } from "@quitecode/chromium-automaton";

await expect(page).element(".ready").toExist();
await expect(page).element(".hidden").not.toBeVisible();
await expect(page).element("h1").toHaveText(/Example Domain/);
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

More examples:

```ts
await expect(page).element("#email").toHaveValue("user@acme.test");
await expect(page).element("#submit").toBeEnabled();
await expect(page).element(".card").toHaveCount(3);
await expect(page).element("#theme").toHaveCss("background-color", "rgb(10, 10, 10)");
await expect(page).element("#field").toBeInViewport({ fully: true });
```
