# Limitations

- Chromium only (no Chrome, Firefox, WebKit)
- XPath selectors do not pierce shadow DOM
- `evaluate(string)` is unsafe for untrusted input
- `goto` allows only http/https unless `allowFileUrl` is enabled
