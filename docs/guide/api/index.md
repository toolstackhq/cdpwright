# API Overview

API docs are split by surface. Use the sidebar or search to jump to:

- [Browser](./browser.md): launch options, contexts, pages, events, close.
- [Page](./page.md): navigation, queries, clicks, typing, uploads, screenshots, selectors, locator discovery.
- [Frame](./frame.md): frame-scoped actions and element state helpers.
- [Locator](./locator.md): reusable handles with click/type/existence/text helpers.
- [Assertions](./assertions.md): `expect(page).element(...)` matchers.

Selector routing: CSS is assumed unless the selector starts with `/`, `./`, `.//`, `..`, or `(` followed by `/` or `.`, which is treated as XPath. Shadow DOM uses CSS with `>>>`.
