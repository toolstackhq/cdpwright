export type SelectorType = "css" | "xpath";

export type ParsedSelector = {
  type: SelectorType;
  value: string;
};

function isXPathSelector(input: string): boolean {
  if (input.startsWith("/")) return true;
  if (input.startsWith("./")) return true;
  if (input.startsWith(".//")) return true;
  if (input.startsWith("..")) return true;
  if (input.startsWith("(")) {
    const trimmed = input.trimStart();
    if (trimmed.startsWith("(")) {
      const inner = trimmed.slice(1).trimStart();
      return inner.startsWith("/") || inner.startsWith(".");
    }
  }
  return false;
}

export function parseSelector(input: string): ParsedSelector {
  const value = input.trim();
  return {
    type: isXPathSelector(value) ? "xpath" : "css",
    value
  };
}
