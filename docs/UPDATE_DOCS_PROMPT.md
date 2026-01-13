# Docs Update Prompt

Use this prompt when asking an assistant to refresh the docs after code changes.

---

You are updating the VitePress docs for Chromium Automaton. Keep docs accurate and aligned with current code. Follow these steps:

1. Review public API surface:
   - src/index.ts exports
   - src/core/Page.ts, src/core/Frame.ts, src/core/Locator.ts
   - src/assert/expect.ts and src/assert/AssertionError.ts
   - src/browser/ChromiumManager.ts and src/browser/Downloader.ts
   - src/cli.ts
2. Update docs pages:
   - docs/index.md (high-level summary + quick example)
   - docs/guide/getting-started.md
  - docs/guide/api/index.md
   - docs/guide/cli.md
   - docs/guide/assertions.md
   - docs/guide/shadow-dom.md
   - docs/guide/frames.md
   - docs/guide/configuration.md
   - docs/guide/limitations.md
3. Ensure code snippets match actual API names and options.
4. Update README.md if public usage or CLI changes.
5. Keep language concise and implementation-accurate (no features that do not exist).
6. If something is not implemented, document as a limitation.

Output a short change summary and list files modified.
