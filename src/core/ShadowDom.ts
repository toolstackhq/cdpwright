export function querySelectorDeep(root: Document | ShadowRoot | Element, selector: string): Element | null {
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

export function querySelectorAllDeep(root: Document | ShadowRoot | Element, selector: string): Element[] {
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
