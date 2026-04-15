import { describe, expect, it } from "vitest";
import { serializeMarkdownFromElement, type MarkdownComputedStyle } from "../src/html/markdown.js";

const runIntegration = process.env.RUN_INTEGRATION === "1";
const testFn = runIntegration ? it : it.skip;

type NodeType = 1 | 3;

type FakeNode = {
  nodeType: NodeType;
  nodeValue?: string | null;
  childNodes: FakeNode[];
};

type FakeElement = FakeNode & {
  tagName: string;
  textContent?: string | null;
  className?: string;
  attrs?: Record<string, string>;
  hasAttribute(name: string): boolean;
  getAttribute(name: string): string | null;
};

function text(value: string): FakeNode {
  return { nodeType: 3, nodeValue: value, childNodes: [] };
}

function nodeText(node: FakeNode): string {
  if (node.nodeType === 3) {
    return node.nodeValue ?? "";
  }
  return node.childNodes.map(nodeText).join("");
}

function el(tagName: string, children: FakeNode[] = [], attrs: Record<string, string> = {}, className = ""): FakeElement {
  return {
    nodeType: 1,
    tagName,
    childNodes: children,
    attrs,
    className,
    hasAttribute(name: string) {
      return Object.prototype.hasOwnProperty.call(attrs, name);
    },
    getAttribute(name: string) {
      return attrs[name] ?? null;
    },
    get textContent() {
      return children.map(nodeText).join("");
    },
  };
}

function visibleStyle(): MarkdownComputedStyle {
  return { display: "block", visibility: "visible" };
}

describe("markdown export", () => {
  testFn("converts rendered content to markdown", async () => {
    const root = el("main", [
      el("h1", [text("History of AI")]),
      el("p", [text("AI started as a research field.")]),
      el("p", [
        text("It includes "),
        el("a", [text("examples")], { href: "https://example.com" }),
        text(" and "),
        el("strong", [text("important")]),
        text(" milestones."),
      ]),
      el("ul", [
        el("li", [text("Symbolic systems")]),
        el("li", [text("Machine learning")]),
      ]),
      el("blockquote", [el("p", [text("Machines that think.")])]),
      el("pre", [el("code", [text('console.log("hello");')], {}, "language-js")]),
      el("table", [
        el("thead", [
          el("tr", [
            el("th", [text("Year")]),
            el("th", [text("Event")]),
          ]),
        ]),
        el("tbody", [
          el("tr", [
            el("td", [text("1956")]),
            el("td", [text("Dartmouth workshop")]),
          ]),
        ]),
      ]),
    ]);

    const markdown = serializeMarkdownFromElement(root, visibleStyle);

    expect(markdown).toContain("# History of AI");
    expect(markdown).toContain("[examples](https://example.com)");
    expect(markdown).toContain("- Symbolic systems");
    expect(markdown).toContain("> Machines that think.");
    expect(markdown).toContain("```");
    expect(markdown).toContain("| Year | Event |");
    expect(markdown).toContain("1956 | Dartmouth workshop");
  });
});
