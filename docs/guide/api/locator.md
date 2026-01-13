# Locator API

Locators wrap a selector so you can reuse it without repeating strings.

```ts
const header = page.locator("header >>> button.menu");

await header.click();
await header.exists(); // boolean
const text = await header.text();
```

Methods:
- `click()` / `dblclick()`
- `type(text)`
- `exists()` returns `boolean`
- `text()` returns `string | null`

Locators are resolved fresh on each call, so they pick up DOM changes and shadow DOM contents.
