# Visa Application Wizard (CDP Stress Test)

## How to run
Open `index.html` directly in a browser. No server required.

## Folder structure
- `index.html` - static entry point
- `styles.css` - minimal styling
- `steps.js` - data-driven step and field definitions
- `app.js` - renderer, state, and behaviour
- `receipt-template.txt` - receipt template loaded at runtime

## Deterministic mode
Open the settings panel via the gear icon.
- Enable **Deterministic mode** to make load delays, draft IDs, and application references repeatable.
- Update the **Seed** to change the deterministic sequence.

## Data-testid conventions
All interactive elements include stable `data-testid` attributes.
- Wrapper: `field.testid + "-wrap"`
- Input: `field.testid`
- Error: `field.testid + "-error"`
- Help: `field.testid + "-help"`

Examples:
- `fld-email-wrap`, `fld-email`, `fld-email-error`
- `fld-travelHistory-wrap`, `fld-travelHistory-add`, `fld-travelHistory-0-country`

## Shadow DOM access
The **Emergency contact** step renders a custom element with an open shadow root.

Example access:
```js
const host = document.querySelector('[data-testid="fld-emergencyContact"] emergency-contact');
const shadowInput = host.shadowRoot.querySelector('[data-testid="fld-ecName"]');
```

## Suggested automation scenarios
- Fill the entire wizard across 21 steps
- Trigger all conditional branches (gender other, dependants, spouse, citizenship, convictions, previous applications)
- Handle the randomized loading overlay with `data-load-ms` and `window.APP_DEBUG.lastLoadMs`
- Interact with autocomplete and multiselect controls
- Add and remove repeater rows (address history and travel history)
- Upload files and wait for simulated progress completion
- Interact with shadow DOM fields in the emergency contact step
- Save draft and resume draft on reload
- Complete payment simulation and assert the success toast
- Submit and download the receipt file

## Browser session isolation (vs Playwright)
- Automaton creates a fresh temporary Chromium profile on every `chromium.launch()` (temp `--user-data-dir`), deleted on `browser.close()`.
- Pages opened from the same browser share that launch’s profile; start a new browser per test for stricter isolation.
- Playwright defaults to fresh contexts per `browser.newContext()`; our per-launch isolation is analogous to starting a new WebDriver session per test.
- You can override the profile path via `LaunchOptions.userDataDir` or `CHROMIUM_AUTOMATON_USER_DATA_DIR` if you need persistence.

## File protocol gotchas
- `fetch('receipt-template.txt')` may fail under `file://` in some browsers; the app uses an embedded fallback template if it does.
- Some browsers block autoplay of downloads; the receipt download may prompt for confirmation.
- LocalStorage is per-file-origin; drafts persist for the same `index.html` location.
