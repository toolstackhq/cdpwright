# Locator API

Locators wrap a selector so you can reuse it without repeating strings.

```ts
const header = page.locator("header >>> button.menu");
const signIn = page.getByRole("button", { name: "Sign in" });
const welcome = page.getByText("Welcome, John!");

await header.click();
await header.exists(); // boolean
const text = await header.text();
await signIn.click();
await page.expect(welcome).toBeVisible();
```

Methods:
- `click()` / `dblclick()`
- `type(text)`
- `exists()` returns `boolean`
- `isVisible()` / `isEnabled()` / `isChecked()`
- `text()` returns `string | null`
- `value()` / `attribute(name)` / `classes()` / `css(property)`
- `hasFocus()` / `isInViewport()` / `isEditable()`
- `count()` returns the number of matching elements

Factory helpers:
- `page.getByRole(role, options?)`
- `page.getByText(text, options?)`

Locators are resolved fresh on each call, so they pick up DOM changes and shadow DOM contents.
Reads and actions auto-wait for the target to appear first, which means locator calls stay stable across small DOM updates. Missing elements count as hidden in assertions.

```ts
const save = page.getByRole("button", { name: "Save" });
await save.click(); // waits for presence + actionability

const message = page.getByText("Saved");
await page.expect(message).toBeVisible();
await page.expect(page.getByText("Loading...")).toBeHidden();
```
