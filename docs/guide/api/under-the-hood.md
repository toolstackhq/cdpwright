# Under the Hood

This page maps the public UI API to the Chromium DevTools Protocol calls it actually makes.

It is intentionally strict:

- only commands that really talk to Chromium are shown with CDP
- thin aliases are grouped instead of repeated
- constructor helpers like `locator()` or `getByRole()` are called out when they do not send CDP by themselves

## How To Read This

- `Page` owns navigation, capture, and page-wide helpers.
- `Frame` uses the same command sequences, but scoped to a frame execution context.
- `Locator` resolves fresh on every call and then delegates to `Frame`.

## Page Command Map

| Command | CDP command(s) | What it does under the hood |
| --- | --- | --- |
| `page.goto(url)` | `Page.navigate` | Loads the URL and waits for the requested lifecycle event. |
| `page.query(selector)` | `Runtime.evaluate` | Returns the first matching element handle. |
| `page.queryAll(selector)` | `Runtime.evaluate` + `Runtime.getProperties` | Returns all matching element handles. |
| `page.queryXPath(selector)` | `Runtime.evaluate` | Returns the first XPath match. |
| `page.queryAllXPath(selector)` | `Runtime.evaluate` + `Runtime.getProperties` | Returns all XPath matches. |
| `page.click(selector)` | `Runtime.evaluate` + `Input.dispatchMouseEvent` | Resolves, scrolls, and clicks the element. |
| `page.dblclick(selector)` | `Runtime.evaluate` + `Input.dispatchMouseEvent` | Resolves, scrolls, and double-clicks the element. |
| `page.fill(selector, value)` | `Runtime.evaluate` | Sets the value directly and dispatches `input` and `change`. |
| `page.type(selector, text)` | `Runtime.evaluate` + `Input.insertText` | Focuses the element and inserts text as input events. |
| `page.clear(selector)` | `Runtime.evaluate` | Same path as `fill(selector, "")`. |
| `page.hover(selector)` | `Runtime.evaluate` + `Input.dispatchMouseEvent` | Moves the pointer to the element center. |
| `page.press(selector, key)` | `Runtime.evaluate` + `Input.dispatchKeyEvent` | Focuses the element and sends a key down/up pair. |
| `page.focus(selector)` | `Runtime.evaluate` | Focuses the element in the page context. |
| `page.blur(selector)` | `Runtime.evaluate` | Blurs the element in the page context. |
| `page.selectText(selector)` | `Runtime.evaluate` | Selects text in inputs, textareas, or editable content. |
| `page.scrollIntoViewIfNeeded(selector)` | `Runtime.evaluate` | Scrolls the element into view. |
| `page.check(selector)` | `Runtime.evaluate` | Sets a checkbox or toggle to checked and dispatches form events. |
| `page.uncheck(selector)` | `Runtime.evaluate` | Sets a checkbox or toggle to unchecked and dispatches form events. |
| `page.setChecked(selector, checked)` | `Runtime.evaluate` | Same check/uncheck path, with the target state explicit. |
| `page.setInputFiles(selector, files)` | `Runtime.evaluate` | Creates `File` objects and assigns them to `<input type="file">`. |
| `page.selectOption(selector, value)` | `Runtime.evaluate` | Sets the selected value on a `<select>`. |
| `page.evaluate(fnOrString, ...)` | `Runtime.evaluate` | Executes arbitrary page-side script and awaits promises. |
| `page.text(selector)` | `Runtime.evaluate` | Reads text content from the page. |
| `page.value(selector)` | `Runtime.evaluate` | Reads the value from a form field. |
| `page.attribute(selector, name)` | `Runtime.evaluate` | Reads an attribute value. |
| `page.isEnabled(selector)` | `Runtime.evaluate` | Checks disabled and aria-disabled state. |
| `page.isChecked(selector)` | `Runtime.evaluate` | Checks checkbox or aria-checked state. |
| `page.count(selector)` | `Runtime.evaluate` | Counts matching nodes. |
| `page.classes(selector)` | `Runtime.evaluate` | Returns the element class list. |
| `page.css(selector, property)` | `Runtime.evaluate` | Reads a computed CSS property. |
| `page.hasFocus(selector)` | `Runtime.evaluate` | Checks whether the element is the active element. |
| `page.isInViewport(selector)` | `Runtime.evaluate` | Checks viewport intersection. |
| `page.isEditable(selector)` | `Runtime.evaluate` | Checks disabled, readonly, and aria-disabled state. |
| `page.findLocators()` | `Runtime.evaluate` | Scans the DOM and optionally writes JSON / HTML artifacts. |
| `page.content()` | `Runtime.evaluate` | Serializes the document HTML after waiting for load. |
| `page.screenshot()` | `Page.captureScreenshot` | Captures a page image. |
| `page.screenshotBase64()` | `Page.captureScreenshot` | Same capture path, returned as base64. |
| `page.pdf()` | `Emulation.setEmulatedMedia` + `Page.printToPDF` | Prints the page to PDF. |

## Frame Behavior

`Frame` uses the same CDP sequences as `Page` for every interaction and inspection method.

The only meaningful difference is scope:

- `Page` acts on the main frame
- `Frame` acts on the selected frame

Frame does not add a different protocol story for interaction methods. It reuses the same commands above with frame-specific execution context.

## Locator Command Map

`Locator` is a fresh-resolution wrapper. It does not hold a stale element handle.

| Command | Underlying Frame method | CDP command(s) | Notes |
| --- | --- | --- | --- |
| `locator.click()` | `frame.clickLocator()` | `Runtime.evaluate` + `Input.dispatchMouseEvent` | Resolves fresh, then clicks. |
| `locator.dblclick()` | `frame.dblclickLocator()` | `Runtime.evaluate` + `Input.dispatchMouseEvent` | Double click sequence. |
| `locator.fill(value)` | `frame.fillLocator()` | `Runtime.evaluate` | Direct value set and form events. |
| `locator.clear()` | `frame.clearLocator()` | `Runtime.evaluate` | Fills an empty string. |
| `locator.type(text)` | `frame.typeLocator()` | `Runtime.evaluate` + `Input.insertText` | Text insertion after focus. |
| `locator.focus()` | `frame.focusLocator()` | `Runtime.evaluate` | Focuses the resolved element. |
| `locator.blur()` | `frame.blurLocator()` | `Runtime.evaluate` | Blurs the resolved element. |
| `locator.hover()` | `frame.hoverLocator()` | `Runtime.evaluate` + `Input.dispatchMouseEvent` | Pointer move over the resolved element. |
| `locator.press(key)` | `frame.pressLocator()` | `Runtime.evaluate` + `Input.dispatchKeyEvent` | Focus, then key down/up. |
| `locator.selectText()` | `frame.selectTextLocator()` | `Runtime.evaluate` | Selects text in a field or editable node. |
| `locator.scrollIntoViewIfNeeded()` | `frame.scrollIntoViewIfNeededLocator()` | `Runtime.evaluate` | Scrolls the resolved node into view. |
| `locator.check()` | `frame.checkLocator()` | `Runtime.evaluate` | Toggles checked state to `true`. |
| `locator.uncheck()` | `frame.uncheckLocator()` | `Runtime.evaluate` | Toggles checked state to `false`. |
| `locator.setChecked(checked)` | `frame.setCheckedLocator()` | `Runtime.evaluate` | Explicit check state change. |
| `locator.setInputFiles(files)` | `frame.setInputFilesLocator()` | `Runtime.evaluate` | File input attachment. |
| `locator.exists()` | `frame.existsLocator()` | `Runtime.evaluate` | Checks whether a matching node exists. |
| `locator.isVisible()` | `frame.isVisibleLocator()` | `Runtime.evaluate` | Checks rendered visibility. |
| `locator.isEnabled()` | `frame.isEnabledLocator()` | `Runtime.evaluate` | Checks enabled state. |
| `locator.isChecked()` | `frame.isCheckedLocator()` | `Runtime.evaluate` | Checks checked or aria-checked state. |
| `locator.text()` | `frame.textLocator()` | `Runtime.evaluate` | Reads text content. |
| `locator.value()` | `frame.valueLocator()` | `Runtime.evaluate` | Reads the current value. |
| `locator.attribute(name)` | `frame.attributeLocator()` | `Runtime.evaluate` | Reads an attribute. |
| `locator.classes()` | `frame.classesLocator()` | `Runtime.evaluate` | Reads class names. |
| `locator.css(property)` | `frame.cssLocator()` | `Runtime.evaluate` | Reads a computed style property. |
| `locator.hasFocus()` | `frame.hasFocusLocator()` | `Runtime.evaluate` | Checks active element state. |
| `locator.isInViewport()` | `frame.isInViewportLocator()` | `Runtime.evaluate` | Checks viewport visibility. |
| `locator.isEditable()` | `frame.isEditableLocator()` | `Runtime.evaluate` | Checks editable state. |
| `locator.count()` | `frame.countLocator()` | `Runtime.evaluate` | Counts matches for the locator query. |

## Exact Sequences

<details>
<summary><code>page.click()</code> and <code>page.dblclick()</code></summary>

These actions follow the same pattern:

```ts
// 1. Resolve and scroll the element into view
Runtime.evaluate(...)

// 2. Move pointer to the element center
Input.dispatchMouseEvent({ type: "mouseMoved", ... })

// 3. Press and release the mouse button
Input.dispatchMouseEvent({ type: "mousePressed", button: "left", clickCount: 1, ... })
Input.dispatchMouseEvent({ type: "mouseReleased", button: "left", clickCount: 1, ... })
```

For `dblclick()`, the mouse press/release pair repeats with `clickCount: 2`.

</details>

<details>
<summary><code>page.fill()</code> and <code>page.clear()</code></summary>

`fill()` and `clear()` both use a single page-side evaluation:

```ts
Runtime.evaluate(...)
```

The evaluated script:

- finds the target element
- sets the value directly
- dispatches `input`
- dispatches `change`

`clear()` is just `fill(selector, "")`.

</details>

<details>
<summary><code>page.type()</code></summary>

`type()` uses a focus step plus native text insertion:

```ts
Runtime.evaluate(...) // focus element
Input.insertText({ text })
```

Use this when you want the page to observe real text entry rather than a direct value set.

</details>

<details>
<summary><code>page.press()</code></summary>

`press()` focuses first, then sends a key down and key up:

```ts
Runtime.evaluate(...) // focus element
Input.dispatchKeyEvent({ type: "keyDown", ... })
Input.dispatchKeyEvent({ type: "keyUp", ... })
```

This is the path for Enter, Tab, Escape, arrows, and shortcuts.

</details>

<details>
<summary><code>page.hover()</code></summary>

`hover()` resolves the box and moves the pointer to the element center:

```ts
Runtime.evaluate(...)
Input.dispatchMouseEvent({ type: "mouseMoved", ... })
```

</details>

<details>
<summary><code>page.check()</code>, <code>page.uncheck()</code>, and <code>page.setChecked()</code></summary>

These use page-side evaluation to update the element state and fire form events:

```ts
Runtime.evaluate(...)
```

The script:

- confirms the element is an `<input>`
- compares the current checked state
- updates `checked`
- dispatches `input`
- dispatches `change`

</details>

<details>
<summary><code>page.setInputFiles()</code></summary>

File upload is also done in the page context:

```ts
Runtime.evaluate(...)
```

The script:

- decodes the provided file data
- creates `File` objects
- populates a `DataTransfer`
- assigns `el.files`
- dispatches `input`
- dispatches `change`

</details>

<details>
<summary><code>page.screenshot()</code>, <code>page.screenshotBase64()</code>, and <code>page.pdf()</code></summary>

```ts
Page.captureScreenshot(...)
```

For PDF:

```ts
Emulation.setEmulatedMedia({ media: "screen" })
Page.printToPDF(...)
```

`pdf()` temporarily switches media to screen, prints, then restores the media setting.

</details>

<details>
<summary><code>page.evaluate()</code>, <code>page.content()</code>, and query helpers</summary>

These are the "read / inspect / script" paths:

- `page.evaluate()` uses `Runtime.evaluate`
- `page.content()` uses `Runtime.evaluate` to serialize the document HTML
- `query()` and `queryXPath()` use `Runtime.evaluate` with `returnByValue: false`
- `queryAll()` and `queryAllXPath()` use `Runtime.evaluate` plus `Runtime.getProperties`

</details>

## Aliases And Wrappers

These do not add a new CDP story of their own:

- `fillInput()` is the same as `fill()`
- `clear()` is `fill()` with an empty string
- `typeSecure()` is the same as `type()`, with sensitive logging
- `textSecure()` is the same as `text()`, with sensitive logging
- `valueSecure()` is the same as `value()`, with sensitive logging
- `setFileInput()` is a small wrapper around `setInputFiles()`
- `page.locator()`, `page.getByText()`, and `page.getByRole()` create locator queries only; they do not send CDP until an action runs
- `locator()` methods are fresh-resolution wrappers around `Frame`

## If You Want More

This page is intentionally "full but readable".

If you want an even deeper layer later, the next step would be a protocol inspector that shows:

- the exact `session.send(...)` payload shape
- the element resolution script used for each action
- the frame-scoped differences for shadow DOM and XPath
