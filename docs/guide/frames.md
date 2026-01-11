# Frames

```ts
const frame = page.frame({ urlIncludes: "embedded" });
if (frame) {
  await frame.click("button.submit");
}
```
