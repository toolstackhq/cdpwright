# Shadow DOM

Use `>>>` shadow selectors for open shadow roots.

```ts
// Click inside a shadow root
await page.click("button-host >>> button.action");

// Read text from inside a shadow root
const text = await page.textContent("button-host >>> .title");

```

Limitations: XPath selectors do not pierce shadow DOM; use CSS with `>>>`.
:::danger
XPath does not pierce shadow DOM. Use CSS with `>>>` for shadow traversal.
:::
