# Page API

Use `Page` for the day-to-day automation surface: navigation, actions, locators, screenshots, and page-level assertions.

## Best uses

- Navigating to a page or local file
- Clicking, typing, filling, uploading, and selecting
- Reading element state with auto-waiting
- Discovering locators for a page or app step
- Capturing screenshots or HTML snapshots

## Navigate

```ts
await page.goto("https://example.com", { waitUntil: "load" });
await page.goto("file:///tmp/app.html", { allowFileUrl: true });
```

`goto()` supports:
- `waitUntil: "load" | "domcontentloaded"`
- `timeoutMs`
- `allowFileUrl`

## Auto-waiting

Most page actions and reads wait for the target element before they continue. That makes the API usable on real pages that update after animation, fetch, or re-render.

```ts
await page.click("#continue");       // waits for presence + actionability
await page.selectOption("#country", "AU");
await page.fillInput("#seed", "42");
const status = await page.text("#status"); // waits until readable
```

Hidden assertions treat missing elements as hidden:

```ts
await page.expect("#loading").toBeHidden();
await page.expect(page.getByText("Saved")).toBeVisible();
```

## Selector styles

CSS is the default selector language:

```ts
await page.click("#submit");
await page.click("button.primary");
```

XPath is used when the selector starts with `/`, `./`, `.//`, `..`, or `(/`:

```ts
await page.queryXPath("//main//h1");
```

Shadow DOM selectors use `>>>`:

```ts
await page.click("payment-card >>> button");
```

## Common actions

```ts
await page.click("#submit");
await page.dblclick(".row");
await page.type("#email", "user@example.com");
await page.typeSecure("#password", "s3cr3t");
await page.fill("#seed", "42");
await page.clear("#seed");
await page.focus("#email");
await page.blur("#email");
await page.hover("#help-icon");
await page.press("#email", "Tab");
await page.selectText("#seed");
await page.scrollIntoViewIfNeeded("#footer");
await page.check("#promo-optin");
await page.uncheck("#promo-optin");
await page.setChecked("#promo-optin", true);
await page.selectOption("#state", "NSW");
await page.setFileInput("#resume", "resume.txt", "contents", { mimeType: "text/plain" });
await page.setInputFiles("#resume", "resume.txt");
```

`typeSecure()` and the secure text helpers mark log output as sensitive.
`fill()` is the Playwright-style field entry helper, while `type()` keeps the character-by-character flow for special keyboard handling.
`setInputFiles()` accepts file paths or inline file objects, and `setFileInput()` remains as a convenience alias for a single synthetic file.

## Inspect state

```ts
const title = await page.evaluate(() => document.title);
const href = await page.evaluate("location.href");

await page.textSecure("#otp");
await page.valueSecure("#email");
```

## Screenshots and HTML

```ts
await page.screenshot({ path: "page.png" });
const base64 = await page.screenshotBase64();
const html = await page.content();
```

`content()` waits for the page to finish loading, then returns the full document HTML with the doctype prefix.

## Frames

```ts
const login = page.frame({ urlIncludes: "/login" });
const frames = page.frames();
const main = page.mainFrame();
```

See [Frame API](./frame.md) for frame-scoped action patterns.

## Locators

Locators are the preferred way to reuse a selector across multiple actions:

```ts
const field = page.locator("#name");
await field.type("Casey");

const signIn = page.getByRole("button", { name: "Sign in" });
await signIn.click();

await page.expect(page.getByText("Welcome, Casey!")).toBeVisible();
```

`getByRole()` matches by ARIA role and accessible name. `getByText()` normalizes whitespace and supports exact or regex matches.
Locators are resolved fresh on each call and auto-wait for presence before reads and actions, which makes them resilient to DOM updates and shadow DOM changes.

## Locate things visually

Use the locator finder when you want to generate selectors from the current page:

```ts
const locators = await page.findLocators({ highlight: true });
await page.find.locators({ outputJson: "locators.json", outputHtml: "locators.html" });
```

## Assertions

Page-level assertions are built in:

```ts
await page.expect("#submit").toBeVisible();
await page.expect().element("h1").toHaveText(/Example/);
await page.expect(page.getByText("Ready")).toBeVisible();
```

See [Assertions](./assertions.md) for the full matcher list.
