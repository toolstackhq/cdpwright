# Frame API

Frames expose the same actions as `Page`, but scoped to a specific frame.

```ts
const child = page.frame({ name: "checkout" });
if (!child) throw new Error("frame missing");

await child.click("#pay-now");
await child.type("#card", "4111111111111111");
await child.selectOption("#expiry-month", "01");
```

Use CSS, XPath, or shadow selectors (`host >>> button`) the same way you do on `Page`.

Frame APIs use the same auto-wait behavior as page APIs: element reads wait for presence first, actions wait for the target to become actionable, and hidden assertions treat missing elements as hidden.

```ts
const payment = page.frame({ name: "payment" });
if (!payment) throw new Error("payment frame missing");

await payment.click("#pay-now");
await payment.expect("#receipt").toBeVisible();
await payment.expect("#spinner").toBeHidden();
```

Frames also support:
- `locator(selector)`
- `getByRole(role, options?)`
- `getByText(text, options?)`
- `evaluate(fn, ...args)`
- `query / queryAll`
- `queryXPath / queryAllXPath`
- `click` / `dblclick`
- `type` / `typeSecure`
- `fillInput`
- `selectOption`
- `setFileInput`
- `findLocators`
- `exists` / `isVisible`
- `text` / `textSecure`
- `attribute` / `value` / `valueSecure`
- `count` / `classes` / `css`
- `isEnabled` / `isChecked` / `isEditable`
- `hasFocus` / `isInViewport`

Screenshots are page-level APIs: use `page.screenshot()` or `page.screenshotBase64()`.

Combine frames with `expect`:

```ts
const payment = page.frame({ urlIncludes: "payments" });
await page.expect().frame({ urlIncludes: "payments" }).element("#pay").toBeEnabled();
await payment.getByRole("button", { name: "Pay now" }).click();
```
