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

### `cpw download`

Download a pinned Chromium snapshot to the local cache.

```bash
cpw download              # pinned revision
cpw download --latest     # latest available revision
cpw download --mirror <url>   # use a custom mirror base URL
cpw download --url <url>      # use an exact zip URL
```

`install` is an alias for `download`.

### `cpw open <url>`

Launch a headed browser and navigate to a URL. The browser stays open until you press `Ctrl+C`.

```bash
cpw open https://example.com
cpw open https://example.com --headless
```

### `cpw screenshot <url> -o <file>`

Capture a screenshot (PNG or JPEG based on file extension).

```bash
cpw screenshot https://example.com -o shot.png
cpw screenshot https://example.com -o shot.png --full-page
cpw screenshot https://example.com -o shot.jpg --headed
```

### `cpw pdf <url> -o <file>`

Generate a PDF of the page. Always runs headless (CDP limitation).

```bash
cpw pdf https://example.com -o page.pdf
```

### `cpw eval <url> <script>`

Run a JavaScript expression in the page and print the result as JSON.

```bash
cpw eval https://example.com "document.title"
cpw eval https://example.com "document.querySelectorAll('a').length"
```

### `cpw version`

Print cdpwright and Chromium versions.

```bash
cpw version
```

## Common options

| Flag | Description |
|------|-------------|
| `--headless` | Run in headless mode (default for `screenshot`, `pdf`, `eval`) |
| `--headed` | Run in headed mode (default for `open`) |
| `-o`, `--output <file>` | Output file path (for `screenshot` and `pdf`) |
| `--full-page` | Capture full scrollable page (for `screenshot`) |
| `--latest` | Download the latest Chromium revision (for `download`) |
| `--mirror <url>` | Custom mirror base URL (for `download`) |
| `--url <url>` | Exact zip URL override (for `download`) |

## Corporate proxy / internal mirrors

See [Configuration](./configuration.md#custom-download-source-corporate-proxy--artifactory) for details on `CDPWRIGHT_DOWNLOAD_MIRROR` and `CDPWRIGHT_DOWNLOAD_URL`.
