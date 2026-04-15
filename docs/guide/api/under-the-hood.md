# Under the Hood

This is a sample map from the high-level UI API to the CDP messages it sends.

Only commands that actually talk to Chromium are listed here.

- Thin wrappers such as `fillInput()` and `typeSecure()` are omitted because they reuse the same underlying action.
- Non-CDP helpers are omitted entirely.
- Read-only helpers are not expanded here to keep this page focused on interaction behavior.

## Quick Map

| Command | CDP command(s) | What it helps you do |
| --- | --- | --- |
| `page.goto(url)` | `Page.navigate` | Load a URL and wait for the requested lifecycle event. |
| `page.click(selector)` | `Runtime.evaluate` + `Input.dispatchMouseEvent` | Resolve a target, scroll it into view, and click it. |
| `page.dblclick(selector)` | `Runtime.evaluate` + `Input.dispatchMouseEvent` | Send a double click at the element center. |
| `page.fill(selector, value)` | `Runtime.evaluate` | Set an input value directly and fire `input`/`change`. |
| `page.type(selector, text)` | `Runtime.evaluate` + `Input.insertText` | Focus an element and insert real text input. |
| `page.hover(selector)` | `Runtime.evaluate` + `Input.dispatchMouseEvent` | Move the pointer over an element. |
| `page.press(selector, key)` | `Runtime.evaluate` + `Input.dispatchKeyEvent` | Focus an element and press a keyboard key. |
| `page.check(selector)` / `page.uncheck(selector)` | `Runtime.evaluate` | Toggle checkbox state and dispatch `input`/`change`. |
| `page.setInputFiles(selector, files)` | `Runtime.evaluate` | Attach file objects to an `<input type="file">`. |
| `page.scrollIntoViewIfNeeded(selector)` | `Runtime.evaluate` | Bring an offscreen element into view. |
| `page.focus(selector)` / `page.blur(selector)` | `Runtime.evaluate` | Move focus to or away from an element. |
| `page.selectText(selector)` | `Runtime.evaluate` | Select text in inputs, textareas, or editable content. |
| `page.screenshot()` | `Page.captureScreenshot` | Capture a PNG or JPEG from Chromium. |
| `page.pdf()` | `Emulation.setEmulatedMedia` + `Page.printToPDF` | Print the current page to PDF. |

## Click

<details>
<summary><code>page.click(selector)</code></summary>

`page.click()` is a two-step action:

| Step | CDP request | Why it happens |
| --- | --- | --- |
| 1 | `Runtime.evaluate` | Resolve the selector, scroll the element into view, and calculate the element box. |
| 2 | `Input.dispatchMouseEvent` (`mouseMoved`) | Move the pointer to the element center. |
| 3 | `Input.dispatchMouseEvent` (`mousePressed`) | Press the left mouse button. |
| 4 | `Input.dispatchMouseEvent` (`mouseReleased`) | Release the left mouse button. |

`page.dblclick()` repeats the mouse sequence a second time with `clickCount: 2`.

</details>

## Fill

<details>
<summary><code>page.fill(selector, value)</code></summary>

`page.fill()` uses one CDP evaluation to update the field in the page context.

| Step | CDP request | Why it happens |
| --- | --- | --- |
| 1 | `Runtime.evaluate` | Find the element, set its value, and dispatch `input` and `change`. |

This is the cleanest path for form fields when you want a direct value set instead of per-key typing.

</details>

## Type

<details>
<summary><code>page.type(selector, text)</code></summary>

`page.type()` uses the browser's text insertion path instead of direct value assignment.

| Step | CDP request | Why it happens |
| --- | --- | --- |
| 1 | `Runtime.evaluate` | Focus the target element in the page context. |
| 2 | `Input.insertText` | Insert the text as real input events. |

Use this when you want the page to observe text entry more like a human would produce it.

</details>

## Keyboard

<details>
<summary><code>page.press(selector, key)</code></summary>

`page.press()` focuses the element first, then sends a key down and key up pair.

| Step | CDP request | Why it happens |
| --- | --- | --- |
| 1 | `Runtime.evaluate` | Focus the target element. |
| 2 | `Input.dispatchKeyEvent` (`keyDown`) | Start the key press. |
| 3 | `Input.dispatchKeyEvent` (`keyUp`) | Finish the key press. |

This is the low-level path for Enter, Tab, Escape, arrows, and shortcuts.

</details>

## Files

<details>
<summary><code>page.setInputFiles(selector, files)</code></summary>

`page.setInputFiles()` updates the file input from script and fires the normal form events.

| Step | CDP request | Why it happens |
| --- | --- | --- |
| 1 | `Runtime.evaluate` | Build `File` objects, assign them to `el.files`, and dispatch `input` and `change`. |

This is useful for upload flows and works with one file or many files.

</details>

## Screenshot And PDF

<details>
<summary><code>page.screenshot()</code> and <code>page.pdf()</code></summary>

| Command | CDP request(s) | Why it happens |
| --- | --- | --- |
| `page.screenshot()` | `Page.captureScreenshot` | Capture the rendered page as an image. |
| `page.pdf()` | `Emulation.setEmulatedMedia` + `Page.printToPDF` | Print the page using Chromium's PDF renderer. |

</details>

## What Is Not Repeated

Some APIs are intentionally not shown twice here:

- `fillInput()` is the same behavior as `fill()`
- `typeSecure()` is the same behavior as `type()`, with sensitive logging
- `clear()` is `fill()` with an empty string
- `setFileInput()` is a small wrapper around `setInputFiles()`

If you want, the next step can be a deeper command-by-command “protocol inspector” page that shows the exact CDP payloads for every public action.
