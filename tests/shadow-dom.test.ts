import { describe, it, expect } from "vitest";
import { Window } from "happy-dom";
import { querySelectorDeep, querySelectorAllDeep } from "../src/core/ShadowDom.js";

describe("shadow dom resolver", () => {
  it("finds element inside shadow root", () => {
    const window = new Window();
    const document = window.document;
    const host = document.createElement("div");
    const shadow = host.attachShadow({ mode: "open" });
    const inner = document.createElement("span");
    inner.className = "target";
    shadow.appendChild(inner);
    document.body.appendChild(host);

    const found = querySelectorDeep(document, ".target");
    expect(found).toBe(inner);
  });

  it("returns all matches across shadow roots", () => {
    const window = new Window();
    const document = window.document;
    const host = document.createElement("div");
    const shadow = host.attachShadow({ mode: "open" });
    const inner1 = document.createElement("span");
    inner1.className = "item";
    const inner2 = document.createElement("span");
    inner2.className = "item";
    shadow.appendChild(inner1);
    shadow.appendChild(inner2);
    document.body.appendChild(host);

    const found = querySelectorAllDeep(document, ".item");
    expect(found.length).toBe(2);
  });
});
