export function querySelectorDeep(root: Document | ShadowRoot | Element, selector: string): Element | null {
  if (typeof Element === "undefined") {
    return null;
  }
  function walk(node: Document | ShadowRoot | Element, sel: string, results: Element[]) {
    if (node instanceof Element && node.matches(sel)) {
      results.push(node);
    }
    if (node instanceof Element && node.shadowRoot) {
      walk(node.shadowRoot, sel, results);
    }
    const children: Element[] = [];
    if ("children" in node) {
      children.push(...Array.from((node as Element | Document | ShadowRoot).children));
    }
    for (const child of children) {
      walk(child, sel, results);
    }
  }

  function findAll(rootNode: Document | ShadowRoot | Element, sel: string) {
    const results: Element[] = [];
    walk(rootNode, sel, results);
    return results;
  }

  if (selector.includes(">>>")) {
    const parts = selector.split(">>>").map((p) => p.trim()).filter(Boolean);
    let scope: Array<Document | ShadowRoot | Element> = [root];
    for (const part of parts) {
      const matches: Element[] = [];
      for (const item of scope) {
        matches.push(...findAll(item, part));
      }
      if (matches.length === 0) return null;
      scope = matches;
    }
    return (scope[0] as Element) ?? null;
  }
  const results = findAll(root, selector);
  return results[0] ?? null;
}

export function querySelectorAllDeep(root: Document | ShadowRoot | Element, selector: string): Element[] {
  if (typeof Element === "undefined") {
    return [];
  }
  function walk(node: Document | ShadowRoot | Element, sel: string, results: Element[]) {
    if (node instanceof Element && node.matches(sel)) {
      results.push(node);
    }
    if (node instanceof Element && node.shadowRoot) {
      walk(node.shadowRoot, sel, results);
    }
    const children: Element[] = [];
    if ("children" in node) {
      children.push(...Array.from((node as Element | Document | ShadowRoot).children));
    }
    for (const child of children) {
      walk(child, sel, results);
    }
  }

  function findAll(rootNode: Document | ShadowRoot | Element, sel: string) {
    const results: Element[] = [];
    walk(rootNode, sel, results);
    return results;
  }

  if (selector.includes(">>>")) {
    const parts = selector.split(">>>").map((p) => p.trim()).filter(Boolean);
    let scope: Array<Document | ShadowRoot | Element> = [root];
    for (const part of parts) {
      const matches: Element[] = [];
      for (const item of scope) {
        matches.push(...findAll(item, part));
      }
      scope = matches;
      if (scope.length === 0) return [];
    }
    return scope.filter((el): el is Element => el instanceof Element);
  }
  return findAll(root, selector);
}

export function serializeShadowDomHelpers() {
  return {
    querySelectorDeep: querySelectorDeep.toString(),
    querySelectorAllDeep: querySelectorAllDeep.toString()
  };
}
