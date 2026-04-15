export type MarkdownComputedStyle = {
  display: string;
  visibility: string;
};

export type MarkdownTreeNode = {
  nodeType: 1 | 3;
  nodeValue?: string | null;
  tagName?: string;
  attrs?: Record<string, string>;
  className?: string;
  style?: MarkdownComputedStyle;
  childNodes: MarkdownTreeNode[];
};

const NODE_TEXT = 3;
const NODE_ELEMENT = 1;

export function serializeMarkdownFromTree(root: MarkdownTreeNode): string {
  function isElement(node: MarkdownTreeNode): node is MarkdownTreeNode & { nodeType: 1; tagName: string } {
    return node.nodeType === NODE_ELEMENT;
  }

  function isText(node: MarkdownTreeNode): node is MarkdownTreeNode & { nodeType: 3; nodeValue?: string | null } {
    return node.nodeType === NODE_TEXT;
  }

  function isIgnored(el: MarkdownTreeNode & { nodeType: 1; tagName: string }): boolean {
    const tag = el.tagName.toLowerCase();
    return tag === "script" || tag === "style" || tag === "noscript" || tag === "template";
  }

  function isHidden(el: MarkdownTreeNode & { nodeType: 1; tagName: string }): boolean {
    const attrs = el.attrs ?? {};
    if (Object.prototype.hasOwnProperty.call(attrs, "hidden") || attrs["aria-hidden"] === "true") return true;
    const style = el.style;
    return style ? style.display === "none" || style.visibility === "hidden" : false;
  }

  function collapseWhitespace(value: string): string {
    return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ");
  }

  function collectText(node: MarkdownTreeNode): string {
    if (isText(node)) {
      return node.nodeValue ?? "";
    }
    if (!isElement(node)) {
      return "";
    }
    return node.childNodes.map((child) => collectText(child)).join("");
  }

  function escapeInline(value: string): string {
    return value
      .replace(/\\/g, "\\\\")
      .replace(/([`*_{}\[\]()#!])/g, "\\$1");
  }

  function indentLines(value: string, depth: number): string {
    const prefix = "  ".repeat(depth);
    return value
      .split("\n")
      .map((line) => (line.trim() ? `${prefix}${line}` : line))
      .join("\n");
  }

  function inlineChildren(parent: MarkdownTreeNode): string {
    let output = "";
    for (const child of parent.childNodes) {
      output += inlineNode(child);
    }
    return output;
  }

  function inlineNode(node: MarkdownTreeNode): string {
    if (isText(node)) {
      return escapeInline(collapseWhitespace(node.nodeValue ?? ""));
    }
    if (!isElement(node) || isIgnored(node) || isHidden(node)) return "";

    const tag = node.tagName.toLowerCase();
    const attrs = node.attrs ?? {};

    if (tag === "br") return "\n";
    if (tag === "a") {
      const text = inlineChildren(node).trim();
      const href = attrs.href?.trim();
      if (!href) return text;
      return `[${text || href}](${href})`;
    }
    if (tag === "img") {
      const alt = attrs.alt?.trim() ?? "";
      const src = attrs.src?.trim();
      return src ? `![${escapeInline(alt)}](${src})` : "";
    }
    if (tag === "strong" || tag === "b") {
      const text = inlineChildren(node).trim();
      return text ? `**${text}**` : "";
    }
    if (tag === "em" || tag === "i") {
      const text = inlineChildren(node).trim();
      return text ? `*${text}*` : "";
    }
    if (tag === "code") {
      const text = node.childNodes.map((child) => (isText(child) ? child.nodeValue ?? "" : "")).join("");
      const inline = text.replace(/\r/g, "").replace(/`/g, "\\`").trim();
      return inline ? `\`${inline}\`` : "";
    }
    if (tag === "sup") {
      const text = inlineChildren(node).trim();
      return text ? `^(${text})` : "";
    }

    return inlineChildren(node);
  }

  function collectElementsByTag(node: MarkdownTreeNode, tagName: string): (MarkdownTreeNode & { nodeType: 1; tagName: string })[] {
    const matches: (MarkdownTreeNode & { nodeType: 1; tagName: string })[] = [];
    for (const child of node.childNodes) {
      if (!isElement(child)) continue;
      if (child.tagName.toLowerCase() === tagName) {
        matches.push(child);
      }
      matches.push(...collectElementsByTag(child, tagName));
    }
    return matches;
  }

  function serializeTable(table: MarkdownTreeNode & { nodeType: 1; tagName: string }): string {
    const rows = collectElementsByTag(table, "tr");
    if (rows.length === 0) return "";

    const hasHeader = rows.some((row) => row.childNodes.some((cell) => isElement(cell) && cell.tagName.toLowerCase() === "th"));
    const rowValues = rows.map((row) =>
      row.childNodes
        .filter((cell): cell is MarkdownTreeNode & { nodeType: 1; tagName: string } => isElement(cell) && (cell.tagName.toLowerCase() === "th" || cell.tagName.toLowerCase() === "td"))
        .map((cell) => inlineChildren(cell).trim().replace(/\|/g, "\\|"))
    );

    const headers = hasHeader ? rowValues[0] : rowValues[0].map((_, index) => `Column ${index + 1}`);
    const bodyRows = hasHeader ? rowValues.slice(1) : rowValues;
    const separator = headers.map(() => "---").join(" | ");
    const lines = [`| ${headers.join(" | ")} |`, `| ${separator} |`];

    for (const row of bodyRows) {
      const normalized = [...row];
      while (normalized.length < headers.length) normalized.push("");
      lines.push(`| ${normalized.join(" | ")} |`);
    }

    return `\n\n${lines.join("\n")}\n\n`;
  }

  function serializeList(list: MarkdownTreeNode & { nodeType: 1; tagName: string }, ordered: boolean, depth: number): string {
    const items = list.childNodes.filter((child): child is MarkdownTreeNode & { nodeType: 1; tagName: string } => isElement(child) && child.tagName.toLowerCase() === "li");
    if (items.length === 0) return "";

    const lines: string[] = [];
    const pad = "  ".repeat(depth);

    items.forEach((item, index) => {
      const marker = ordered ? `${index + 1}. ` : "- ";
      const parts: string[] = [];
      const nestedBlocks: string[] = [];

      for (const child of item.childNodes) {
        if (isElement(child) && (child.tagName.toLowerCase() === "ul" || child.tagName.toLowerCase() === "ol")) {
          const nested = serializeList(child, child.tagName.toLowerCase() === "ol", depth + 1).trim();
          if (nested) nestedBlocks.push(indentLines(nested, depth + 1));
          continue;
        }

        const text = blockNode(child, depth).trim();
        if (text) parts.push(text);
      }

      const content = parts.join(" ").replace(/\s+\n/g, "\n").trim();
      lines.push(`${pad}${marker}${content}`);
      for (const nested of nestedBlocks) {
        lines.push(nested);
      }
    });

    return `\n\n${lines.join("\n")}\n\n`;
  }

  function blockNode(node: MarkdownTreeNode, depth: number): string {
    if (isText(node)) {
      return collapseWhitespace(node.nodeValue ?? "");
    }
    if (!isElement(node) || isIgnored(node) || isHidden(node)) return "";

    const tag = node.tagName.toLowerCase();

    if (tag === "h1" || tag === "h2" || tag === "h3" || tag === "h4" || tag === "h5" || tag === "h6") {
      const level = Number(tag.slice(1));
      const text = inlineChildren(node).trim();
      return text ? `\n\n${"#".repeat(level)} ${text}\n\n` : "";
    }
    if (tag === "p") {
      const text = inlineChildren(node).trim();
      return text ? `\n\n${text}\n\n` : "";
    }
    if (tag === "blockquote") {
      const content = blockChildren(node, depth).trim();
      if (!content) return "";
      return `\n\n${content
        .split("\n")
        .map((line) => (line.trim() ? `> ${line}` : ">"))
        .join("\n")}\n\n`;
    }
    if (tag === "pre") {
      const codeBlock = node.childNodes.find((child): child is MarkdownTreeNode & { nodeType: 1; tagName: string; className?: string } =>
        isElement(child) && child.tagName.toLowerCase() === "code"
      );
      const code = (codeBlock ? collectText(codeBlock) : collectText(node))
        .replace(/\r/g, "")
        .replace(/\n+$/, "");
      const lang = codeBlock?.className?.match(/language-([a-z0-9_-]+)/i)?.[1] ?? "";
      return `\n\n\`\`\`${lang}\n${code}\n\`\`\`\n\n`;
    }
    if (tag === "ul") return serializeList(node, false, depth);
    if (tag === "ol") return serializeList(node, true, depth);
    if (tag === "table") return serializeTable(node);
    if (tag === "hr") return "\n\n---\n\n";
    if (tag === "figure") {
      const content = blockChildren(node, depth).trim();
      return content ? `\n\n${content}\n\n` : "";
    }
    if (tag === "summary") {
      const text = inlineChildren(node).trim();
      return text ? `\n\n**${text}**\n\n` : "";
    }
    if (tag === "details" || tag === "section" || tag === "article" || tag === "main" || tag === "div" || tag === "body" || tag === "header" || tag === "footer" || tag === "aside" || tag === "nav") {
      return blockChildren(node, depth);
    }

    return inlineChildren(node);
  }

  function blockChildren(parent: MarkdownTreeNode, depth: number): string {
    let output = "";
    for (const child of parent.childNodes) {
      output += blockNode(child, depth);
    }
    return output;
  }

  function normalize(value: string): string {
    return value
      .replace(/\r/g, "")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  const markdown = normalize(blockChildren(root, 0));
  return markdown ? `${markdown}\n` : "";
}
