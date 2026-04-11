# Changelog

## 1.0.0 (cdpwright)
- Renamed to **cdpwright**, published under `@toolstackhq/cdpwright`.
- CLI binaries: `cdpwright` (canonical) and `cpw` (short alias); the previous `ca` / `chromium-automaton` bins have been removed.
- Env vars renamed `CHROMIUM_AUTOMATON_*` → `CDPWRIGHT_*` (breaking).
- Default cache directory moved from `~/.cache/chromium-automaton` to `~/.cache/cdpwright` (Linux/macOS) and `%LOCALAPPDATA%\cdpwright` (Windows).

## 1.0.0 (chromium-automaton, pre-rename)
- First stable release of Chromium Automaton.
- Package scope moved to `@automation01/chromium-automaton`.
- Added short CLI alias support via `npx ca`.

## 0.1.0-beta.2
- Added locator finder enhancements: optional JSON/HTML outputs (auto-written to `artifacts/`), copy-to-clipboard links, and improved highlighting/logging.
- Locator scan now focuses on interactables/headings and filters fallback results to avoid noise.
- Locator finder integration test writes artifacts for start and contact steps.
