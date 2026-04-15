# Locator API

Locators are the reusable handles in `cdpwright`. Use them when the same selector shows up more than once or when you want a handle that survives DOM updates.

## Why locators feel stable

- They are resolved fresh on every call
- They auto-wait for presence before reads and actions
- They work across shadow DOM boundaries
- They fit nicely with `page.expect(...)`

## Basic usage

```ts
const header = page.locator("header >>> button.menu");
const signIn = page.getByRole("button", { name: "Sign in" });
const welcome = page.getByText("Welcome, John!");

await header.click();
await signIn.click();
await page.expect(welcome).toBeVisible();
```

## Common locator methods

- `click()` / `dblclick()`
- `fill(value)` / `clear()`
- `type(text)`
- `focus()` / `blur()`
- `hover()`
- `press(key)`
- `selectText()`
- `scrollIntoViewIfNeeded()`
- `check()` / `uncheck()` / `setChecked(checked)`
- `setInputFiles(files)`
- `exists()` returns `boolean`
- `isVisible()` / `isEnabled()` / `isChecked()`
- `text()` returns `string | null`
- `value()` / `attribute(name)` / `classes()` / `css(property)`
- `hasFocus()` / `isInViewport()` / `isEditable()`
- `count()` returns the number of matching elements

For form entry, prefer `fill()` over `type()` when you want a direct value assignment and built-in waiting. Use `type()` when you need character-by-character input or custom key handling.

## Factory helpers

- `page.getByRole(role, options?)`
- `page.getByText(text, options?)`

These are the best choices when you want semantic locators instead of selector strings.

## Auto-waiting behavior

```ts
const save = page.getByRole("button", { name: "Save" });
await save.click(); // waits for presence + actionability

const message = page.getByText("Saved");
await page.expect(message).toBeVisible();
await page.expect(page.getByText("Loading...")).toBeHidden();
```

Missing elements count as hidden in assertions, which keeps locator assertions readable on pages that mount and unmount content.
