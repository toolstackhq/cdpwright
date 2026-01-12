# CLI

## Download

```bash
chromium-automaton download
chromium-automaton download --latest
```

## Cache layout

```
<cacheRoot>/<platform>/<revision>/
```

## Environment variables
- `CHROMIUM_AUTOMATON_CACHE_DIR`
- `CHROMIUM_AUTOMATON_REVISION`
- `CHROMIUM_AUTOMATON_EXECUTABLE_PATH`
- `CHROMIUM_AUTOMATON_LOG_LEVEL`
- `CHROMIUM_AUTOMATON_LOG` (set to `false` to disable action/assertion logs)
