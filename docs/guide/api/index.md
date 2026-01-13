# API Overview

API docs are split by surface. Use the sidebar or search to jump to:

- [Browser](./browser.md): launch options, contexts, pages, close.
- [Page](./page.md): navigation, queries, clicks, typing, uploads, screenshots, selectors.
- [Frame](./frame.md): frame-scoped equivalents of Page actions.
- [Locator](./locator.md): reusable handles with click/type/query helpers.
- [Assertions](./assertions.md): `expect(page).element(...)` matchers.

Selector routing: CSS is assumed unless the selector starts with `/`, `./`, `.//`, `..`, or `(` followed by `/` or `.`, which is treated as XPath. Shadow DOM uses CSS with `>>>`.
