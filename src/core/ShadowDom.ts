function walkAndCollect(node: Document | ShadowRoot | Element, selector: string, results: Element[]) {
  if (node instanceof Element && node.matches(selector)) {
    results.push(node);
  }
  // Always consider the current node's shadow root, even if it has no light DOM children.
  if (node instanceof Element && node.shadowRoot) {
    walkAndCollect(node.shadowRoot, selector, results);
  }
  const children: Element[] = [];
  if ("children" in node) {
    children.push(...Array.from((node as Element | Document | ShadowRoot).children));
  }
  for (const child of children) {
    walkAndCollect(child, selector, results);
  }
}

function querySelectorAllDeepCore(root: Document | ShadowRoot | Element, selector: string): Element[] {
  const results: Element[] = [];
  walkAndCollect(root, selector, results);
  return results;
}

function querySelectorAllDeepChain(root: Document | ShadowRoot | Element, selector: string): Element[] {
  const parts = selector.split(">>>").map((p) => p.trim()).filter(Boolean);
  let scope: Array<Document | ShadowRoot | Element> = [root];
  for (const part of parts) {
    const matches: Element[] = [];
    for (const item of scope) {
      matches.push(...querySelectorAllDeepCore(item, part));
    }
    scope = matches;
    if (scope.length === 0) return [];
  }
  return scope.filter((el): el is Element => el instanceof Element);
}

export function querySelectorDeep(root: Document | ShadowRoot | Element, selector: string): Element | null {
  if (selector.includes(">>>")) {
    const parts = selector.split(">>>").map((p) => p.trim()).filter(Boolean);
    let scope: Array<Document | ShadowRoot | Element> = [root];
    for (const part of parts) {
      const matches: Element[] = [];
      for (const item of scope) {
        matches.push(...querySelectorAllDeepCore(item, part));
      }
      if (matches.length === 0) return null;
      scope = matches;
    }
    return (scope[0] as Element) ?? null;
  }
  const results = querySelectorAllDeepCore(root, selector);
  return results[0] ?? null;
}

export function querySelectorAllDeep(root: Document | ShadowRoot | Element, selector: string): Element[] {
  if (selector.includes(">>>")) {
    return querySelectorAllDeepChain(root, selector);
  }
  return querySelectorAllDeepCore(root, selector);
}

export function serializeShadowDomHelpers() {
  return {
    querySelectorDeep: querySelectorDeep.toString(),
    querySelectorAllDeep: querySelectorAllDeep.toString()
  };
}
