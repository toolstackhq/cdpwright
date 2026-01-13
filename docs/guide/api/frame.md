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

Frames also support:
- `evaluate(fn, ...args)`
- `query / queryAll`
- `queryXPath / queryAllXPath`
- `dblclick`
- `type` / `typeSecure`
- `selectOption`
- `setFileInput`
- `textSecure` / `valueSecure`
- `screenshot` / `screenshotBase64` via the parent page

Combine frames with `expect`:

```ts
const payment = page.frame({ urlIncludes: "payments" });
await page.expect().frame({ urlIncludes: "payments" }).element("#pay").toBeEnabled();
```
