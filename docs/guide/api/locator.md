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
