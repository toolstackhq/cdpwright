# Configuration

## Cache
- Linux/macOS: `~/.cache/chromium-automaton`
- Windows: `%LOCALAPPDATA%\\chromium-automaton`

## Environment
- `CHROMIUM_AUTOMATON_CACHE_DIR`
- `CHROMIUM_AUTOMATON_REVISION`
- `CHROMIUM_AUTOMATON_EXECUTABLE_PATH`
- `CHROMIUM_AUTOMATON_LOG_LEVEL`
- `CHROMIUM_AUTOMATON_LOG` (set to `false` to disable action/assertion logs)

## Sensitive data
Action and assertion logs never include typed or captured text values, only the action name and selector. Use `typeSecure`, `textSecure`, or `valueSecure` to avoid logging selectors as well.
