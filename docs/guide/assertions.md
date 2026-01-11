# Assertions

```ts
import { expect } from "@quitecode/chromium-automaton";

await expect(page).element(".ready").toExist();
await expect(page).element(".hidden").not.toBeVisible();
await expect(page).element("h1").toHaveText(/Example Domain/);
```
