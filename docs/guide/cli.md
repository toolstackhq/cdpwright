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

## Sessions

`cpw open` launches a browser and saves a **session**. While the session is running, other commands (`screenshot`, `html`, `pdf`, `eval`) can be run from a separate terminal **without a URL** — they auto-connect to the open browser.

```bash
# Terminal 1
npx cpw open https://example.com

# Terminal 2 (while Terminal 1 is running)
npx cpw screenshot -o shot.png
npx cpw eval "document.title"
npx cpw close
```

When a URL **is** provided, commands run standalone (launch → act → close) without needing a session.

## Commands

### `cpw download`

Download a pinned Chromium snapshot to the local cache.

```bash
npx cpw download              # pinned revision
npx cpw download --latest     # latest available revision
npx cpw download --mirror <url>   # use a custom mirror base URL
npx cpw download --url <url>      # use an exact zip URL
```

`install` is an alias for `download`.

### `cpw open <url>`

Launch a headed browser, navigate to a URL, and save a session. The browser stays open until you press `Ctrl+C` or run `cpw close` from another terminal.

```bash
npx cpw open https://example.com
npx cpw open https://example.com --headless
```

### `cpw close`

Close the running browser session.

```bash
npx cpw close
```

### `cpw screenshot [url] -o <file>`

Capture a screenshot (PNG or JPEG based on file extension).

```bash
# Standalone (launches its own browser)
npx cpw screenshot https://example.com -o shot.png
npx cpw screenshot https://example.com -o shot.png --full-page

# Session (connects to running browser, no URL needed)
npx cpw screenshot -o shot.png
```

### `cpw html [url] -o <file>`

Save the page's current HTML source to disk.

```bash
npx cpw html https://example.com -o page.html

# Session mode
npx cpw html -o page.html
```

### `cpw pdf [url] -o <file>`

Generate a visual PDF of the page by rendering a screenshot into a PDF. This matches the on-screen browser view better than Chromium's print stylesheet.

```bash
npx cpw pdf https://example.com -o page.pdf

# Session mode
npx cpw pdf -o page.pdf
```

### `cpw eval [url] <script>`

Run a JavaScript expression in the page and print the result as JSON.

```bash
# Standalone
npx cpw eval https://example.com "document.title"

# Session (just the script, no URL)
npx cpw eval "document.title"
npx cpw eval "document.querySelectorAll('a').length"
```

### `cpw version`

Print cdpwright and Chromium versions. Also shows whether a session is active.

```bash
npx cpw version
```

## Common options

| Flag | Description |
|------|-------------|
| `--headless` | Run in headless mode (default for `screenshot`, `pdf`, `eval`) |
| `--headed` | Run in headed mode (default for `open`) |
| `-o`, `--output <file>` | Output file path (for `screenshot`, `html`, and `pdf`) |
| `--full-page` | Capture full scrollable page (for `screenshot`) |
| `--latest` | Download the latest Chromium revision (for `download`) |
| `--mirror <url>` | Custom mirror base URL (for `download`) |
| `--url <url>` | Exact zip URL override (for `download`) |

## Corporate proxy / internal mirrors

See [Configuration](./configuration.md#custom-download-source-corporate-proxy--artifactory) for details on `CDPWRIGHT_DOWNLOAD_MIRROR` and `CDPWRIGHT_DOWNLOAD_URL`.
