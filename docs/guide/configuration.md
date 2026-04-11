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

## Sensitive data
Action and assertion logs never include typed or captured text values, only the action name and selector. Use `typeSecure`, `textSecure`, or `valueSecure` to avoid logging selectors as well.
