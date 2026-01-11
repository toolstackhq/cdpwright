# Shadow DOM

Use `pierceShadowDom: true` for open shadow roots.

```ts
await page.click("button.action", { pierceShadowDom: true });
const text = await page.evaluate(() => document.title);
```

Limitations: XPath selectors do not pierce shadow DOM.
