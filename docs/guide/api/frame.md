# Frame API

Frames expose the same automation surface as `Page`, but scoped to a specific iframe or frame target.

## When to use this

- Your app embeds a checkout, auth, or widget frame
- You need to interact with nested content from the main page
- You want the same auto-waiting behavior without switching to raw CDP

## Find the frame

```ts
const checkout = page.frame({ name: "checkout" });
if (!checkout) throw new Error("checkout frame missing");
```

You can also target frames by URL fragments:

```ts
const payment = page.frame({ urlIncludes: "payments" });
if (!payment) throw new Error("payment frame missing");
```

## Use it like a page

```ts
await checkout.click("#pay-now");
await checkout.type("#card", "4111111111111111");
await checkout.selectOption("#expiry-month", "01");
await checkout.expect("#receipt").toBeVisible();
```

CSS, XPath, and shadow selectors work the same way they do on `Page`.

## Auto-waiting still applies

Frame reads wait for presence first, actions wait for actionability, and hidden assertions treat missing elements as hidden.

```ts
await payment.expect("#spinner").toBeHidden();
await payment.expect("#receipt").toBeVisible();
```

## Locators and queries

Frames support the same query and locator helpers as `Page`:

- `locator(selector)`
- `getByRole(role, options?)`
- `getByText(text, options?)`
- `query / queryAll`
- `queryXPath / queryAllXPath`
- `findLocators`

Example:

```ts
const pay = payment.getByRole("button", { name: "Pay now" });
await pay.click();
await payment.expect(pay).toBeEnabled();
```

## Other helpers

Frame instances also support:

- `evaluate(fn, ...args)`
- `click` / `dblclick`
- `type` / `typeSecure`
- `fillInput`
- `selectOption`
- `setFileInput`
- `exists` / `isVisible`
- `text` / `textSecure`
- `attribute` / `value` / `valueSecure`
- `count` / `classes` / `css`
- `isEnabled` / `isChecked` / `isEditable`
- `hasFocus` / `isInViewport`

Screenshots are page-level APIs, so use `page.screenshot()` or `page.screenshotBase64()`.
