# Changelog

## 1.4.1
- Fixed the Vitest scaffold to use `cdpExpect(page).element(...)` from `@toolstackhq/cdpwright`.
- Aligned all generated scaffold templates with the Linux Chromium launch flags used by CI.
- Documented the scaffold assertions and launch options in the README and guides.

## 1.4.0
- Added `cpw init test <runner>` scaffolding for Vitest, Mocha, and Node's built-in test runner.
- Added `chromium.withBrowser()` for Playwright-style lifecycle-managed scripts.
- Documented the helper and scaffold flow in the README and getting-started guide.

## 1.3.3
- Added `chromium.withBrowser()` for Playwright-style lifecycle-managed scripts.
- Documented the helper in the README and getting-started guide.

## 1.3.2
- Added a Playwright-style explicit Chromium install step and made CI run it before tests.
- Promoted `cpw install` in the docs and CLI help as the primary browser cache command.

## 1.3.1
- Added auto-waiting for element reads and interactions, including locator reads and hidden assertions.
- Documented the auto-wait API surface across Page, Frame, Locator, and Assertions.
- CI now runs the full integration suite headless; headed tests stay headed locally.

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
