function querySelectorDeepChain(root: Document | ShadowRoot | Element, selector: string): Element | null {
  const parts = selector.split(">>>").map((p) => p.trim()).filter(Boolean);
  let scope: Array<Document | ShadowRoot | Element> = [root];
  for (const part of parts) {
    const matches: Element[] = [];
    for (const item of scope) {
      matches.push(...querySelectorAllDeep(item, part));
    }
    if (matches.length === 0) return null;
    scope = matches;
  }
  return (scope[0] as Element) ?? null;
}

export function querySelectorDeep(root: Document | ShadowRoot | Element, selector: string): Element | null {
  if (selector.includes(">>>")) {
    return querySelectorDeepChain(root, selector);
  }
  const elements = Array.from(root.querySelectorAll("*"));
  for (const el of elements) {
    if (el.matches(selector)) {
      return el;
    }
    const shadow = (el as Element & { shadowRoot?: ShadowRoot }).shadowRoot;
    if (shadow) {
      const found = querySelectorDeep(shadow, selector);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

function querySelectorAllDeepChain(root: Document | ShadowRoot | Element, selector: string): Element[] {
  const parts = selector.split(">>>").map((p) => p.trim()).filter(Boolean);
  let scope: Array<Document | ShadowRoot | Element> = [root];
  for (const part of parts) {
    const matches: Element[] = [];
    for (const item of scope) {
      matches.push(...querySelectorAllDeep(item, part));
    }
    scope = matches;
    if (scope.length === 0) return [];
  }
  return scope.filter((el): el is Element => el instanceof Element);
}

export function querySelectorAllDeep(root: Document | ShadowRoot | Element, selector: string): Element[] {
  if (selector.includes(">>>")) {
    return querySelectorAllDeepChain(root, selector);
  }
  const results: Element[] = [];
  const elements = Array.from(root.querySelectorAll("*"));
  for (const el of elements) {
    if (el.matches(selector)) {
      results.push(el);
    }
    const shadow = (el as Element & { shadowRoot?: ShadowRoot }).shadowRoot;
    if (shadow) {
      results.push(...querySelectorAllDeep(shadow, selector));
    }
  }
  return results;
}

export function serializeShadowDomHelpers() {
  return {
    querySelectorDeep: querySelectorDeep.toString(),
    querySelectorAllDeep: querySelectorAllDeep.toString()
  };
}
