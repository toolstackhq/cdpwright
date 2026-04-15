# CLI

cdpwright ships a CLI accessible as `cpw` (or `cdpwright`).

When installed locally in a project, use `npx`:

```bash
npx cpw <command>
```

For a global `cpw` command:

```bash
npm install -g @toolstackhq/cdpwright
cpw <command>
```

> All examples below use `npx cpw` — drop the `npx` if installed globally.

## Commands

Each command launches its own browser, does its job, and exits.

If you want to prewarm the browser cache first, run:

```bash
npx cpw install
```

### `cpw screenshot <url> -o <file>`

Capture a screenshot (PNG or JPEG based on file extension).

```bash
npx cpw screenshot https://example.com -o shot.png
npx cpw screenshot https://example.com -o shot.png --full-page
npx cpw screenshot https://example.com -o shot.jpg --headed
```

### `cpw pdf <url> -o <file>`

Generate a visual PDF of the page by rendering a screenshot into a PDF. This matches the on-screen browser view better than Chromium's print stylesheet.

```bash
npx cpw pdf https://example.com -o page.pdf
```

### `cpw html <url> -o <file>`

Save the page's current HTML source to disk.

```bash
npx cpw html https://example.com -o page.html
```

### `cpw eval <url> <script>`

Run a JavaScript expression in the page and print the result as JSON.

```bash
npx cpw eval https://example.com "document.title"
npx cpw eval https://example.com "document.querySelectorAll('a').length"
```

### `cpw install`

Download a pinned Chromium snapshot to the local cache, Playwright-style.

```bash
npx cpw install                # pinned revision
npx cpw install --latest       # latest available revision
npx cpw install --mirror <url> # use a custom mirror base URL
npx cpw install --url <url>    # use an exact zip URL
```

`download` is an alias for `install`.

### `cpw version`

Print cdpwright and Chromium versions.

```bash
npx cpw version
```

## Options

| Flag | Description |
|------|-------------|
| `--headless` | Run in headless mode (default for `screenshot`, `pdf`, `eval`) |
| `--headed` | Run in headed mode |
| `-o`, `--output <file>` | Output file path (for `screenshot`, `html`, and `pdf`) |
| `--full-page` | Capture full scrollable page (for `screenshot`) |
| `--latest` | Download the latest Chromium revision (for `install`) |
| `--mirror <url>` | Custom mirror base URL (for `install`) |
| `--url <url>` | Exact zip URL override (for `install`) |

## Interactive session

For interactive workflows — manually browse a page, then run CLI commands against it from another terminal.

### `cpw open <url>`

Launch a headed browser, navigate to a URL, and start a session. The browser stays open until you press `Ctrl+C` or run `cpw close`.

```bash
npx cpw open https://example.com
```

### `cpw close`

Close the running browser session.

```bash
npx cpw close
```

### Using commands with a session

While a session is running, commands work **without a URL** — they operate on the live page:

```bash
# Terminal 1 — open and manually browse
npx cpw open https://example.com

# Terminal 2 — run commands against the live page
npx cpw screenshot -o shot.png
npx cpw eval "document.title"
npx cpw pdf -o page.pdf
npx cpw close
```

This is useful when you need to log in, navigate to a specific state, or interact with the page before capturing or extracting data.

## Corporate proxy / internal mirrors

See [Configuration](./configuration.md#custom-download-source-corporate-proxy--artifactory) for details on `CDPWRIGHT_DOWNLOAD_MIRROR` and `CDPWRIGHT_DOWNLOAD_URL`.
