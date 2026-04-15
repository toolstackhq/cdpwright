type RootNode = Document | ShadowRoot | Element;

export function querySelectorDeep(root: RootNode, selector: string): Element | null {
  const ElementCtor = typeof Element !== "undefined"
    ? Element
    : ((root as Document | ShadowRoot | Element & { ownerDocument?: Document }).ownerDocument || (root as any)).defaultView?.Element ?? null;
  if (!ElementCtor) return null;

  function isElementNode(node: RootNode): node is Element {
    return node instanceof ElementCtor;
  }

  function nodeChildren(node: RootNode): Element[] {
    if (!("children" in node)) {
      return [];
    }
    return Array.from(node.children as unknown as Iterable<Element>);
  }

  function walk(node: RootNode, sel: string, results: Element[]) {
    if (isElementNode(node) && node.matches(sel)) {
      results.push(node);
    }
    if (isElementNode(node) && node.shadowRoot) {
      walk(node.shadowRoot, sel, results);
    }
    for (const child of nodeChildren(node)) {
      walk(child, sel, results);
    }
  }

  function findAll(rootNode: RootNode, sel: string) {
    const results: Element[] = [];
    walk(rootNode, sel, results);
    return results;
  }

  if (selector.includes(">>>")) {
    const parts = selector.split(">>>").map((p) => p.trim()).filter(Boolean);
    let scope: RootNode[] = [root];
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
  const ElementCtor = typeof Element !== "undefined"
    ? Element
    : ((root as Document | ShadowRoot | Element & { ownerDocument?: Document }).ownerDocument || (root as any)).defaultView?.Element ?? null;
  if (!ElementCtor) return [];

  function isElementNode(node: RootNode): node is Element {
    return node instanceof ElementCtor;
  }

  function nodeChildren(node: RootNode): Element[] {
    if (!("children" in node)) {
      return [];
    }
    return Array.from(node.children as unknown as Iterable<Element>);
  }

  function walk(node: RootNode, sel: string, results: Element[]) {
    if (isElementNode(node) && node.matches(sel)) {
      results.push(node);
    }
    if (isElementNode(node) && node.shadowRoot) {
      walk(node.shadowRoot, sel, results);
    }
    for (const child of nodeChildren(node)) {
      walk(child, sel, results);
    }
  }

  function findAll(rootNode: RootNode, sel: string) {
    const results: Element[] = [];
    walk(rootNode, sel, results);
    return results;
  }

  if (selector.includes(">>>")) {
    const parts = selector.split(">>>").map((p) => p.trim()).filter(Boolean);
    let scope: RootNode[] = [root];
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
