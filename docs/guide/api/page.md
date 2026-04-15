# Page API

High-level actions against the main frame of a page.

## Navigation

```ts
await page.goto("https://example.com", { waitUntil: "load" });
```

Supports `waitUntil: "load" | "domcontentloaded"` (throws if invalid), `timeoutMs`, and `allowFileUrl`.

## Auto-wait

Most element-facing page APIs wait for the target to exist before reading state or interacting with it. This includes:

- `click` / `dblclick`
- `type` / `typeSecure`
- `fillInput`
- `selectOption`
- `setFileInput`
- text/value/attribute/class/css/focus/viewport/editable helpers

Assertions build on the same behavior, so `page.expect("#selector").toBeVisible()` and `page.expect(page.getByText(...)).toBeHidden()` keep polling until the state is stable. A missing element counts as hidden.

```ts
// Waits for the button to exist and become clickable.
await page.click("#continue");

// Waits for the select to exist before assigning the option.
await page.selectOption("#country", "AU");

// Waits for text to appear before reading it.
const status = await page.text("#status");
```

```ts
// Hidden assertions treat missing elements as hidden.
await page.expect("#loading").toBeHidden();
await page.expect(page.getByText("Saved")).toBeVisible();
```

## Queries

```ts
const handle = await page.query(".card");
const all = await page.queryAll("li");
const xpath = await page.queryXPath("//h1");
```

Selectors use CSS by default; XPath when the selector starts with `/`, `./`, `.//`, `..`, or `(/`.

## Clicks

```ts
await page.click("#submit");
await page.dblclick(".row");
```

## Typing

```ts
await page.type("#email", "user@example.com");
await page.typeSecure("#password", "s3cr3t"); // marks logs as sensitive
await page.fillInput("#deterministic-seed", "42"); // sets value + input/change events
```

## Selects and uploads

```ts
await page.selectOption("#state", "NSW");
await page.setFileInput("#resume", "resume.txt", "contents", { mimeType: "text/plain" });
```

## Evaluate

```ts
const title = await page.evaluate(() => document.title);
const href = await page.evaluate("location.href");
```

## Text helpers

```ts
await page.textSecure("#otp");   // reads text with sensitive logging
await page.valueSecure("#email"); // reads value with sensitive logging
```

## Screenshots

```ts
await page.screenshot({ path: "page.png" });
const base64 = await page.screenshotBase64();
```

## HTML source

```ts
const html = await page.content();
```

`content()` waits for the page to finish loading, then returns the full document HTML with the doctype prefix.

## Frames

```ts
const frames = page.frames();
const main = page.mainFrame();
const login = page.frame({ urlIncludes: "/login" });
```

## Locators

```ts
const field = page.locator("#name");
await field.type("Casey");

const signIn = page.getByRole("button", { name: "Sign in" });
await signIn.click();

await page.expect(page.getByText("Welcome, Casey!")).toBeVisible();
```

`getByRole()` matches by ARIA role and accessible name. `getByText()` normalizes whitespace and supports exact or regex matches.
Locators are resolved fresh on each call and auto-wait for presence before reads and actions, which makes them resilient to DOM updates and shadow DOM changes.

## Locator discovery

```ts
const locators = await page.findLocators({
  highlight: true
});

// alias
const locators2 = await page.find.locators({
  outputJson: "locators.json",
  outputHtml: "locators.html"
});
```

`findLocators` supports `highlight`, `outputPath`, `outputJson`, and `outputHtml`.

## Assertions

Use the built-in expect helpers:

```ts
await page.expect("#submit").toBeVisible();
await page.expect().element("h1").toHaveText(/Example/);
await page.expect(page.getByText("Ready")).toBeVisible();
```

See [Assertions](./assertions.md) for matcher details.
