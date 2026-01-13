# Shadow DOM

:::danger
XPath does not pierce shadow DOM. Use CSS with `>>>` for shadow traversal.
:::

Use `>>>` shadow selectors for open shadow roots.

```ts
// Click inside a shadow root
await page.click("button-host >>> button.action");

// Read text from inside a shadow root
const text = await page.textContent("button-host >>> .title");

```
