# Page API

High-level actions against the main frame of a page.

## Navigation

```ts
await page.goto("https://example.com", { waitUntil: "load" });
```

Supports `waitUntil: "load" | "domcontentloaded"`, `timeoutMs`, and `allowFileUrl`.

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
```

## Selects and uploads

```ts
await page.selectOption("#state", "NSW");
await page.setFileInput("#resume", "resume.txt", "contents", { mimeType: "text/plain" });
```

## Evaluate

```ts
const title = await page.evaluate(() => document.title);
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
```

## Assertions

Use the built-in expect helpers:

```ts
await page.expect("#submit").toBeVisible();
await page.expect().element("h1").toHaveText(/Example/);
```

See [Assertions](./assertions.md) for matcher details.
