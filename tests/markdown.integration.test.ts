import { describe, expect, it } from "vitest";
import { serializeMarkdownFromTree, type MarkdownComputedStyle, type MarkdownTreeNode } from "../src/html/markdown.js";

const runIntegration = process.env.RUN_INTEGRATION === "1";
const testFn = runIntegration ? it : it.skip;

function text(value: string): MarkdownTreeNode {
  return { nodeType: 3, nodeValue: value, childNodes: [] };
}

function el(
  tagName: string,
  children: MarkdownTreeNode[] = [],
  attrs: Record<string, string> = {},
  className = "",
  style: MarkdownComputedStyle = { display: "block", visibility: "visible" }
): MarkdownTreeNode {
  return {
    nodeType: 1,
    tagName,
    childNodes: children,
    attrs,
    className,
    style,
  };
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

    const markdown = serializeMarkdownFromTree(root);

    expect(markdown).toContain("# History of AI");
    expect(markdown).toContain("[examples](https://example.com)");
    expect(markdown).toContain("- Symbolic systems");
    expect(markdown).toContain("> Machines that think.");
    expect(markdown).toContain("```");
    expect(markdown).toContain("| Year | Event |");
    expect(markdown).toContain("1956 | Dartmouth workshop");
  });
});
