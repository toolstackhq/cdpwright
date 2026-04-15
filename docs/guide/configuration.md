# Configuration

## Cache
- Linux/macOS: `~/.cache/cdpwright`
- Windows: `%LOCALAPPDATA%\\cdpwright`

## Environment
- `CDPWRIGHT_CACHE_DIR`
- `CDPWRIGHT_REVISION`
- `CDPWRIGHT_EXECUTABLE_PATH`
- `CDPWRIGHT_LOG_LEVEL`
- `CDPWRIGHT_LOG` (set to `false` to disable action/assertion logs)
- `CDPWRIGHT_DOWNLOAD_MIRROR` — custom mirror base URL (see below)
- `CDPWRIGHT_DOWNLOAD_URL` — exact zip URL override (see below)

## Custom download source (corporate proxy / Artifactory)

If the default Google CDN is blocked (e.g. behind a corporate proxy), you can point cdpwright at an internal mirror or a specific zip URL.

**Option 1 — Mirror base URL** (recommended for Artifactory/Nexus proxy repos):

```bash
# Set once — cdpwright appends /{platform}/{revision}/{zip} automatically
export CDPWRIGHT_DOWNLOAD_MIRROR=https://artifactory.corp.com/chromium-snapshots
npx cpw install
```

Or via CLI flag:
```bash
npx cpw install --mirror https://artifactory.corp.com/chromium-snapshots
```

The mirror must replicate the same directory layout as the upstream (`Linux_x64/1567454/chrome-linux.zip`, etc). Most Artifactory remote/proxy repos do this automatically.

**Option 2 — Exact zip URL** (escape hatch for non-standard layouts):

```bash
export CDPWRIGHT_DOWNLOAD_URL=https://internal.corp.com/bins/chrome-linux.zip
npx cpw install
```

Or via CLI flag:
```bash
npx cpw install --url https://internal.corp.com/bins/chrome-linux.zip
```

Priority: `CDPWRIGHT_DOWNLOAD_URL` > `CDPWRIGHT_DOWNLOAD_MIRROR` > default Google CDN. CLI flags take precedence over env vars.

Both `http://` and `https://` URLs are supported.

## Sensitive data
Action and assertion logs never include typed or captured text values, only the action name and selector. Use `typeSecure`, `textSecure`, or `valueSecure` to avoid logging selectors as well.
