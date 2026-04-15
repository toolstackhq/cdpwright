import fs from "fs";
import path from "path";
import { Session } from "../cdp/Session.js";
import { Logger } from "../logging/Logger.js";
import { AutomationEvents } from "./Events.js";
import { waitFor } from "./Waiter.js";
import { parseSelector } from "./Selectors.js";
import { serializeShadowDomHelpers } from "./ShadowDom.js";
import { Locator } from "./Locator.js";
import type { LocatorQuery } from "./Locator.js";

export type FrameSelectorOptions = {
  pierceShadowDom?: boolean;
  timeoutMs?: number;
};

export type TextLocatorOptions = {
  exact?: boolean;
  timeoutMs?: number;
};

export type RoleLocatorOptions = {
  name?: string | RegExp;
  exact?: boolean;
  includeHidden?: boolean;
  timeoutMs?: number;
};

export type ClickOptions = {
  timeoutMs?: number;
};

export type TypeOptions = {
  timeoutMs?: number;
  sensitive?: boolean;
};

export type QueryResult = {
  objectId: string;
  contextId: number;
};

type ElementBox = {
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
};

export class Frame {
  readonly id: string;
  name?: string;
  url?: string;
  parentId?: string;
  private session: Session;
  private logger: Logger;
  private events: AutomationEvents;
  private contextId?: number;
  private defaultTimeout = 30_000;

  constructor(id: string, session: Session, logger: Logger, events: AutomationEvents) {
    this.id = id;
    this.session = session;
    this.logger = logger;
    this.events = events;
  }

  setExecutionContext(contextId?: number) {
    this.contextId = contextId;
  }

  getExecutionContext() {
    return this.contextId;
  }

  setMeta(meta: { name?: string; url?: string; parentId?: string }) {
    this.name = meta.name;
    this.url = meta.url;
    this.parentId = meta.parentId;
  }

  getEvents() {
    return this.events;
  }

  async evaluate<T = unknown>(fnOrString: string | ((...args: any[]) => any), ...args: any[]): Promise<T> {
    return this.evaluateInContext(fnOrString, args);
  }

  async query(selector: string, options: FrameSelectorOptions = {}): Promise<QueryResult | null> {
    return this.querySelectorInternal(selector, options, false);
  }

  async queryAll(selector: string, options: FrameSelectorOptions = {}): Promise<QueryResult[]> {
    return this.querySelectorAllInternal(selector, options, false);
  }

  async queryXPath(selector: string, options: FrameSelectorOptions = {}): Promise<QueryResult | null> {
    return this.querySelectorInternal(selector, options, true);
  }

  async queryAllXPath(selector: string, options: FrameSelectorOptions = {}): Promise<QueryResult[]> {
    return this.querySelectorAllInternal(selector, options, true);
  }

  locator(selector: string, options: FrameSelectorOptions = {}) {
    return new Locator(this, { kind: "selector", selector, options });
  }

  getByText(text: string | RegExp, options: TextLocatorOptions = {}) {
    return new Locator(this, { kind: "text", text, options });
  }

  getByRole(role: string, options: RoleLocatorOptions = {}) {
    return new Locator(this, { kind: "role", role, options });
  }

  async click(selector: string, options: ClickOptions = {}) {
    await this.performClick(selector, options, false);
  }

  async dblclick(selector: string, options: ClickOptions = {}) {
    await this.performClick(selector, options, true);
  }

  async type(selector: string, text: string, options: TypeOptions = {}) {
    const start = Date.now();
    const parsed = parseSelector(selector);
    const pierce = Boolean(parsed.pierceShadowDom);
    this.events.emit("action:start", { name: "type", selector, frameId: this.id, sensitive: options.sensitive });
    await waitFor(async () => {
      const box = await this.resolveElementBox(selector, options);
      if (!box || !box.visible) {
        return false;
      }
      return true;
    }, { timeoutMs: options.timeoutMs ?? this.defaultTimeout, description: `type ${selector}` });

    const helpers = serializeShadowDomHelpers();
    const focusExpression = `(function() {
      const querySelectorDeep = ${helpers.querySelectorDeep};
      const root = document;
      const selector = ${JSON.stringify(selector)};
      const el = ${pierce ? "querySelectorDeep(root, selector)" : "root.querySelector(selector)"};
      if (!el) {
        return;
      }
      el.focus();
    })()`;
    const focusParams: Record<string, unknown> = {
      expression: focusExpression,
      returnByValue: true
    };
    if (this.contextId) {
      focusParams.contextId = this.contextId;
    }
    await this.session.send("Runtime.evaluate", focusParams);

    await this.session.send("Input.insertText", { text });
    const duration = Date.now() - start;
    this.events.emit("action:end", { name: "type", selector, frameId: this.id, durationMs: duration, sensitive: options.sensitive });
    this.logger.debug("Type", selector, `${duration}ms`);
  }

  async typeSecure(selector: string, text: string, options: TypeOptions = {}) {
    return this.type(selector, text, { ...options, sensitive: true });
  }

  async fillInput(selector: string, value: string, options: { timeoutMs?: number } = {}) {
    const start = Date.now();
    this.events.emit("action:start", { name: "fillInput", selector, frameId: this.id });
    await waitFor(async () => {
      const expression = `(function() {
        const selector = ${JSON.stringify(selector)};
        const findDeep = (sel) => {
          if (sel.includes(">>>")) {
            const parts = sel.split(">>>").map((s) => s.trim()).filter(Boolean);
            let scope = [document];
            for (const part of parts) {
              const next = [];
              for (const node of scope) {
                const roots = [node];
                if (node instanceof Element && node.shadowRoot) roots.push(node.shadowRoot);
                for (const root of roots) {
                  next.push(...root.querySelectorAll(part));
                }
              }
              if (!next.length) return null;
              scope = next;
            }
            return scope[0] || null;
          }
          return document.querySelector(sel);
        };
        const el = findDeep(selector);
        if (!el) return false;
        if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement)) {
          return false;
        }
        el.value = ${JSON.stringify(value)};
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      })()`;
      const params: Record<string, unknown> = {
        expression,
        returnByValue: true
      };
      if (this.contextId) {
        params.contextId = this.contextId;
      }
      const result = await this.session.send<{ result: { value?: boolean } }>("Runtime.evaluate", params);
      return Boolean(result.result?.value);
    }, { timeoutMs: options.timeoutMs ?? this.defaultTimeout, description: `fillInput ${selector}` });
    const duration = Date.now() - start;
    this.events.emit("action:end", { name: "fillInput", selector, frameId: this.id, durationMs: duration });
    this.logger.debug("FillInput", selector, `${duration}ms`);
  }

  async findLocators(options: { highlight?: boolean; outputPath?: string; outputJson?: string; outputHtml?: string } = {}) {
    const start = Date.now();
    this.events.emit("action:start", { name: "findLocators", frameId: this.id });
    const artifactsDir = path.resolve(process.cwd(), "artifacts");
    try {
      fs.mkdirSync(artifactsDir, { recursive: true });
    } catch {
      // ignore dir creation errors
    }
    const resolveOut = (name?: string) => {
      if (!name) return null;
      const base = path.basename(name);
      return path.join(artifactsDir, base);
    };
    const outputJson = resolveOut(options.outputJson || options.outputPath);
    const outputHtml = resolveOut(options.outputHtml);
    const expression = `(function() {
      const highlight = ${options.highlight !== false};
      const previous = Array.from(document.querySelectorAll(".__cdpwright-locator-overlay"));
      previous.forEach((el) => el.remove());

      const cssEscape = (value) => {
        if (typeof CSS !== "undefined" && CSS.escape) return CSS.escape(value);
        return value.replace(/[^a-zA-Z0-9_-]/g, (c) => "\\\\" + c.charCodeAt(0).toString(16) + " ");
      };

      const visible = (el) => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none" && Number(style.opacity || "1") > 0;
      };

      const siblingsIndex = (el) => {
        if (!el.parentElement) return 1;
        const sibs = Array.from(el.parentElement.children).filter((n) => n.tagName === el.tagName);
        return sibs.indexOf(el) + 1;
      };

      const xpathFor = (el) => {
        const parts = [];
        let node = el;
        while (node && node.nodeType === 1 && node !== document.documentElement) {
          const idx = siblingsIndex(node);
          parts.unshift(node.tagName.toLowerCase() + "[" + idx + "]");
          node = node.parentElement;
        }
        return "//" + parts.join("/");
      };

      const buildLocator = (el) => {
        const testid = el.getAttribute("data-testid");
        const id = el.id;
        const name = el.getAttribute("name");
        const aria = el.getAttribute("aria-label");
        const labelledBy = el.getAttribute("aria-labelledby");
        const placeholder = el.getAttribute("placeholder");
        const role = el.getAttribute("role");
        const labelText = (() => {
          if (labelledBy) {
            const ref = document.getElementById(labelledBy);
            if (ref) return ref.textContent?.trim() || "";
          }
          if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
            const idRef = el.id && document.querySelector("label[for='" + el.id.replace(/'/g, "\\\\'") + "']");
            if (idRef) return idRef.textContent?.trim() || "";
            const wrap = el.closest("label");
            if (wrap) return wrap.textContent?.trim() || "";
          }
          return "";
        })();

        let css = "";
        let quality = "low";
        let reason = "fallback";
        if (testid) {
          css = "[data-testid=\"" + testid.replace(/"/g, '\\\\"') + "\"]";
          quality = "high";
          reason = "data-testid";
        } else if (id) {
          css = "#" + cssEscape(id);
          quality = "high";
          reason = "id";
        } else if (name) {
          css = "[name=\"" + name.replace(/"/g, '\\\\"') + "\"]";
          quality = "ok";
          reason = "name";
        } else if (aria) {
          css = "[aria-label=\"" + aria.replace(/"/g, '\\\\"') + "\"]";
          quality = "ok";
          reason = "aria-label";
        } else if (placeholder) {
          css = "[placeholder=\"" + placeholder.replace(/"/g, '\\\\"') + "\"]";
          quality = "low";
          reason = "placeholder";
        } else if (labelText) {
          css = el.tagName.toLowerCase() + "[aria-label=\"" + labelText.replace(/"/g, '\\\\"') + "\"]";
          quality = "low";
          reason = "label text";
        } else {
          const nth = siblingsIndex(el);
          css = el.tagName.toLowerCase() + ":nth-of-type(" + nth + ")";
          quality = "low";
          reason = "nth-of-type";
        }

        const tag = el.tagName.toLowerCase();
        const type = el.getAttribute("type") || "";
        const text = (el.textContent || "").trim().slice(0, 80);

        return {
          name: labelText || aria || placeholder || name || testid || id || tag,
          css,
          xpath: xpathFor(el),
          quality,
          reason,
          visible: true,
          tag,
          type,
          role,
          text,
          id,
          nameAttr: name,
          dataTestid: testid
        };
      };

        const preferredSelectors = ["input", "select", "textarea", "button", "a[href]", "[role='button']", "[contenteditable='true']", "h1", "h2", "h3", "h4", "h5", "h6", "label", "legend", "fieldset"];
        let nodes = Array.from(document.querySelectorAll(preferredSelectors.join(", ")));
        if (nodes.length === 0) {
          nodes = Array.from(document.querySelectorAll("*")).filter((el) => {
            if (!(el instanceof HTMLElement)) return false;
            const tag = el.tagName.toLowerCase();
            if (preferredSelectors.includes(tag)) return true;
            if (tag === "a" && el.hasAttribute("href")) return true;
            if (el.getAttribute("role") === "button") return true;
            if (el.hasAttribute("contenteditable")) return true;
            return false;
          });
        }
      const results = [];
      nodes.forEach((el) => {
        const isVisible = visible(el);
        const locator = buildLocator(el);
        locator.visible = isVisible;
        results.push(locator);
      });

      if (highlight) {
        results.forEach((loc, index) => {
          const el = nodes[index];
          if (!el) return;
          const rect = el.getBoundingClientRect();
          const overlay = document.createElement("div");
          overlay.className = "__cdpwright-locator-overlay";
          overlay.style.position = "absolute";
          overlay.style.left = rect.x + window.scrollX + "px";
          overlay.style.top = rect.y + window.scrollY + "px";
          overlay.style.width = rect.width + "px";
          overlay.style.height = rect.height + "px";
          overlay.style.border = "2px solid #e67e22";
          overlay.style.borderRadius = "6px";
          overlay.style.pointerEvents = "none";
          overlay.style.zIndex = "99999";
          const badge = document.createElement("div");
          badge.textContent = String(index);
          badge.style.position = "absolute";
          badge.style.top = "-10px";
          badge.style.left = "-10px";
          badge.style.background = "#e67e22";
          badge.style.color = "#fff";
          badge.style.fontSize = "12px";
          badge.style.padding = "2px 6px";
          badge.style.borderRadius = "10px";
          overlay.appendChild(badge);
          document.body.appendChild(overlay);
        });
      }

      if (console && console.table) {
        console.table(results.map((r, idx) => ({ idx, name: r.name, css: r.css, quality: r.quality, reason: r.reason, tag: r.tag, type: r.type })));
      }
      return results;
    })()`;

    const params: Record<string, unknown> = {
      expression,
      returnByValue: true
    };
    if (this.contextId) {
      params.contextId = this.contextId;
    }
    let result = await this.session.send<{ result: { value?: any[] } }>("Runtime.evaluate", params);
    const duration = Date.now() - start;
    this.events.emit("action:end", { name: "findLocators", frameId: this.id, durationMs: duration });
    const value = (result.result?.value as any[]) ?? [];
    if (Array.isArray(value) && value.length > 0) {
      this.logger.info("FindLocators", `${value.length} candidates`, value.slice(0, 5).map((v) => v.css || v.name || v.tag));
      if (outputJson) {
        try {
          fs.writeFileSync(outputJson, JSON.stringify(value, null, 2), "utf-8");
          this.logger.info("FindLocators", `written to ${outputJson}`);
        } catch (err) {
          this.logger.warn("FindLocators write failed", err);
        }
      }
      if (outputHtml) {
        this.writeLocatorHtml(outputHtml, value);
      }
      return value;
    }
    // Fallback: filtered scan to avoid empty results while ignoring document chrome
    result = await this.session.send<{ result: { value?: any[] } }>("Runtime.evaluate", {
      expression: `(function() {
        const allowed = ["input","select","textarea","button","a","label","legend","fieldset","h1","h2","h3","h4","h5","h6"];
        const skip = ["html","head","body","meta","link","script","style"];
        return Array.from(document.querySelectorAll("*"))
          .filter((el) => {
            if (!(el instanceof HTMLElement)) return false;
            const tag = el.tagName.toLowerCase();
            if (skip.includes(tag)) return false;
            if (tag === "a" && el.hasAttribute("href")) return true;
            if (el.getAttribute("role") === "button") return true;
            if (el.hasAttribute("contenteditable")) return true;
            return allowed.includes(tag);
          })
          .slice(0, 200)
          .map((el, idx) => ({
            name: el.getAttribute("aria-label") || el.getAttribute("name") || el.getAttribute("data-testid") || el.id || el.tagName.toLowerCase() + "-" + idx,
            css: el.id ? "#" + el.id : el.getAttribute("data-testid") ? "[data-testid=\\"" + el.getAttribute("data-testid") + "\\"]" : el.tagName.toLowerCase(),
            xpath: "",
            quality: "low",
            reason: "fallback",
            visible: true,
            tag: el.tagName.toLowerCase(),
            type: el.getAttribute("type") || "",
            role: el.getAttribute("role") || ""
          }));
      })()`,
      returnByValue: true
    });
    const fallback = (result.result?.value as any[]) ?? [];
    this.logger.info("FindLocators", `${fallback.length} candidates`, fallback.slice(0, 5).map((v) => v.css || v.name || v.tag));
    if (outputJson) {
      try {
        fs.writeFileSync(outputJson, JSON.stringify(fallback, null, 2), "utf-8");
        this.logger.info("FindLocators", `written to ${outputJson}`);
      } catch (err) {
        this.logger.warn("FindLocators write failed", err);
      }
    }
    if (outputHtml) {
      this.writeLocatorHtml(outputHtml, fallback);
    }
    return fallback;
  }

  private writeLocatorHtml(filePath: string, data: any[]) {
    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Locators</title>
  <style>
    body { font-family: "Segoe UI", system-ui, -apple-system, sans-serif; padding: 16px; background: #f8f9fa; color: #222; }
    h1 { font-size: 20px; margin-bottom: 12px; }
    table { border-collapse: collapse; width: 100%; background: #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.08); }
    th, td { border: 1px solid #e5e7eb; padding: 8px; font-size: 13px; text-align: left; }
    th { background: linear-gradient(180deg, #f6f7fb, #edf0f7); font-weight: 600; }
    tr:nth-child(even) { background: #fafbfc; }
    .copy { color: #2563eb; text-decoration: underline dotted; cursor: pointer; font-size: 12px; background: none; border: none; padding: 0; opacity: 0; transition: opacity 0.15s ease; }
    tr:hover .copy { opacity: 1; }
    .copy:hover { color: #1d4ed8; }
    .loc-value { margin-left: 6px; font-family: ui-monospace, SFMono-Regular, SFMono, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
  </style>
</head>
<body>
  <h1>Locator candidates</h1>
  <table>
    <thead>
      <tr><th>#</th><th>Name</th><th>CSS</th><th>XPath</th><th>Quality</th><th>Reason</th><th>Visible</th></tr>
    </thead>
    <tbody id="rows"></tbody>
  </table>
  <script>
    const data = ${JSON.stringify(data)};
    const rows = document.getElementById("rows");
    data.forEach((loc, idx) => {
      const tr = document.createElement("tr");
      const cells = [
        idx,
        loc.name || "",
        loc.css || "",
        loc.xpath || "",
        loc.quality || "",
        loc.reason || "",
        String(loc.visible)
      ];
      cells.forEach((val, i) => {
        const td = document.createElement("td");
        if (i === 2 || i === 3) {
          const link = document.createElement("button");
          link.className = "copy";
          link.textContent = "copy";
          link.addEventListener("click", async (e) => {
            e.preventDefault();
            try { await navigator.clipboard.writeText(val); link.textContent = "copied"; setTimeout(() => link.textContent = "copy", 1000); }
            catch { link.textContent = "error"; }
          });
          const span = document.createElement("span");
          span.className = "loc-value";
          span.textContent = val;
          td.appendChild(link);
          td.appendChild(span);
        } else {
          td.textContent = val;
        }
        tr.appendChild(td);
      });
      rows.appendChild(tr);
    });
  </script>
</body>
</html>`;
    try {
      fs.writeFileSync(filePath, html, "utf-8");
      this.logger.info("FindLocators", `HTML written to ${filePath}`);
    } catch (err) {
      this.logger.warn("FindLocators HTML write failed", err);
    }
  }

  async exists(selector: string, options: FrameSelectorOptions = {}) {
    const handle = await this.query(selector, options);
    if (handle) {
      await this.releaseObject(handle.objectId);
      return true;
    }
    return false;
  }

  async isVisible(selector: string, options: FrameSelectorOptions = {}) {
    const box = await this.resolveElementBox(selector, options);
    return Boolean(box && box.visible);
  }

  async clickLocator(query: LocatorQuery, options: ClickOptions = {}) {
    await this.performClickLocator(query, options, false);
  }

  async dblclickLocator(query: LocatorQuery, options: ClickOptions = {}) {
    await this.performClickLocator(query, options, true);
  }

  async typeLocator(query: LocatorQuery, text: string, options: TypeOptions = {}) {
    const start = Date.now();
    const description = this.locatorDescription(query);
    this.events.emit("action:start", { name: "type", selector: description, frameId: this.id, sensitive: options.sensitive });
    await waitFor(async () => {
      const box = await this.resolveLocatorElementBox(query, options);
      if (!box || !box.visible) {
        return false;
      }
      return true;
    }, { timeoutMs: options.timeoutMs ?? this.defaultTimeout, description: `type ${description}` });

    const focusExpression = this.buildLocatorExpression(query, `
      if (!el) {
        return;
      }
      el.focus();
    `);
    const focusParams: Record<string, unknown> = {
      expression: focusExpression,
      returnByValue: true
    };
    if (this.contextId) {
      focusParams.contextId = this.contextId;
    }
    await this.session.send("Runtime.evaluate", focusParams);
    await this.session.send("Input.insertText", { text });
    const duration = Date.now() - start;
    this.events.emit("action:end", { name: "type", selector: description, frameId: this.id, durationMs: duration, sensitive: options.sensitive });
    this.logger.debug("Type", description, `${duration}ms`);
  }

  async existsLocator(query: LocatorQuery) {
    return Boolean(await this.evalOnLocator<boolean | null>(query, false, `
      return Boolean(el);
    `));
  }

  async isVisibleLocator(query: LocatorQuery) {
    return this.evalOnLocator<boolean | null>(query, false, `
      if (!el) {
        return false;
      }
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none" && Number(style.opacity || "1") > 0;
    `);
  }

  async isEnabledLocator(query: LocatorQuery) {
    await this.waitForLocatorPresence(query, this.defaultTimeout, `isEnabled ${this.locatorDescription(query)}`);
    return this.evalOnLocator<boolean | null>(query, false, `
      if (!el) {
        return null;
      }
      const disabled = Boolean(el.disabled) || el.hasAttribute("disabled");
      const ariaDisabled = el.getAttribute && el.getAttribute("aria-disabled") === "true";
      return !(disabled || ariaDisabled);
    `);
  }

  async isCheckedLocator(query: LocatorQuery) {
    await this.waitForLocatorPresence(query, this.defaultTimeout, `isChecked ${this.locatorDescription(query)}`);
    return this.evalOnLocator<boolean | null>(query, false, `
      if (!el) {
        return null;
      }
      const aria = el.getAttribute && el.getAttribute("aria-checked");
      if (aria === "true") {
        return true;
      }
      if (aria === "false") {
        return false;
      }
      if ("checked" in el) {
        return Boolean(el.checked);
      }
      return null;
    `);
  }

  async textLocator(query: LocatorQuery) {
    await this.waitForLocatorPresence(query, this.defaultTimeout, `text ${this.locatorDescription(query)}`);
    return this.evalOnLocator<string | null>(query, false, `
      if (!el) {
        return null;
      }
      if (el instanceof HTMLInputElement) {
        const type = (el.getAttribute("type") || "text").toLowerCase();
        if (type === "button" || type === "submit" || type === "reset") {
          return el.value || "";
        }
      }
      return el.textContent || "";
    `);
  }

  async valueLocator(query: LocatorQuery) {
    await this.waitForLocatorPresence(query, this.defaultTimeout, `value ${this.locatorDescription(query)}`);
    return this.evalOnLocator<string | null>(query, false, `
      if (!el) {
        return null;
      }
      if ("value" in el) {
        return el.value ?? "";
      }
      return el.getAttribute("value");
    `);
  }

  async attributeLocator(query: LocatorQuery, name: string) {
    await this.waitForLocatorPresence(query, this.defaultTimeout, `attribute ${this.locatorDescription(query)}`);
    return this.evalOnLocator<string | null>(query, false, `
      if (!el || !(el instanceof Element)) {
        return null;
      }
      return el.getAttribute(${JSON.stringify(name)});
    `);
  }

  async classesLocator(query: LocatorQuery) {
    await this.waitForLocatorPresence(query, this.defaultTimeout, `classes ${this.locatorDescription(query)}`);
    return this.evalOnLocator<string[] | null>(query, false, `
      if (!el) {
        return null;
      }
      if (!el.classList) {
        return [];
      }
      return Array.from(el.classList);
    `);
  }

  async cssLocator(query: LocatorQuery, property: string) {
    await this.waitForLocatorPresence(query, this.defaultTimeout, `css ${this.locatorDescription(query)}`);
    return this.evalOnLocator<string | null>(query, false, `
      if (!el) {
        return null;
      }
      const style = window.getComputedStyle(el);
      return style.getPropertyValue(${JSON.stringify(property)}) || "";
    `);
  }

  async hasFocusLocator(query: LocatorQuery) {
    await this.waitForLocatorPresence(query, this.defaultTimeout, `hasFocus ${this.locatorDescription(query)}`);
    return this.evalOnLocator<boolean | null>(query, false, `
      if (!el) {
        return null;
      }
      return document.activeElement === el;
    `);
  }

  async isInViewportLocator(query: LocatorQuery, fully = false) {
    await this.waitForLocatorPresence(query, this.defaultTimeout, `isInViewport ${this.locatorDescription(query)}`);
    return this.evalOnLocator<boolean | null>(query, false, `
      if (!el) {
        return null;
      }
      const rect = el.getBoundingClientRect();
      const viewWidth = window.innerWidth || document.documentElement.clientWidth;
      const viewHeight = window.innerHeight || document.documentElement.clientHeight;
      if (${fully ? "true" : "false"}) {
        return rect.top >= 0 && rect.left >= 0 && rect.bottom <= viewHeight && rect.right <= viewWidth;
      }
      return rect.bottom > 0 && rect.right > 0 && rect.top < viewHeight && rect.left < viewWidth;
    `);
  }

  async isEditableLocator(query: LocatorQuery) {
    await this.waitForLocatorPresence(query, this.defaultTimeout, `isEditable ${this.locatorDescription(query)}`);
    return this.evalOnLocator<boolean | null>(query, false, `
      if (!el) {
        return null;
      }
      const disabled = Boolean(el.disabled) || el.hasAttribute("disabled");
      const readOnly = Boolean(el.readOnly) || el.hasAttribute("readonly");
      const ariaDisabled = el.getAttribute && el.getAttribute("aria-disabled") === "true";
      return !(disabled || readOnly || ariaDisabled);
    `);
  }

  async countLocator(query: LocatorQuery) {
    return this.evalOnLocator<number>(query, true, `
      return elements.length;
    `);
  }

  async text(selector: string, options: FrameSelectorOptions = {}) {
    await this.waitForSelectorPresence(selector, options, false, `text ${selector}`);
    return this.evalOnSelector<string | null>(selector, options, false, `
      if (!el) {
        return null;
      }
      return el.textContent || "";
    `);
  }

  async textSecure(selector: string, options: FrameSelectorOptions = {}) {
    const start = Date.now();
    this.events.emit("action:start", { name: "text", selector, frameId: this.id, sensitive: true });
    const result = await this.text(selector, options);
    const duration = Date.now() - start;
    this.events.emit("action:end", { name: "text", selector, frameId: this.id, durationMs: duration, sensitive: true });
    return result;
  }

  async selectOption(selector: string, value: string) {
    await this.waitForSelectorPresence(selector, {}, false, `selectOption ${selector}`);
    await this.evaluate(
      (sel, val) => {
        const el = document.querySelector(sel);
        if (!(el instanceof HTMLSelectElement)) return false;
        el.value = val;
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      },
      selector,
      value
    );
  }

  async setFileInput(selector: string, name: string, contents: string, options: { mimeType?: string } = {}) {
    await this.waitForSelectorPresence(selector, {}, false, `setFileInput ${selector}`);
    await this.evaluate(
      (sel, fileName, text, mime) => {
        const input = document.querySelector(sel);
        if (!(input instanceof HTMLInputElement)) return false;
        const file = new File([text], fileName, { type: mime || "text/plain" });
        const data = new DataTransfer();
        data.items.add(file);
        input.files = data.files;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      },
      selector,
      name,
      contents,
      options.mimeType || "text/plain"
    );
  }

  async attribute(selector: string, name: string, options: FrameSelectorOptions = {}) {
    await this.waitForSelectorPresence(selector, options, false, `attribute ${selector}`);
    return this.evalOnSelector<string | null>(selector, options, false, `
      if (!el || !(el instanceof Element)) {
        return null;
      }
      return el.getAttribute(${JSON.stringify(name)});
    `);
  }

  async value(selector: string, options: FrameSelectorOptions = {}) {
    await this.waitForSelectorPresence(selector, options, false, `value ${selector}`);
    return this.evalOnSelector<string | null>(selector, options, false, `
      if (!el) {
        return null;
      }
      if ("value" in el) {
        return el.value ?? "";
      }
      return el.getAttribute("value");
    `);
  }

  async valueSecure(selector: string, options: FrameSelectorOptions = {}) {
    const start = Date.now();
    this.events.emit("action:start", { name: "value", selector, frameId: this.id, sensitive: true });
    const result = await this.value(selector, options);
    const duration = Date.now() - start;
    this.events.emit("action:end", { name: "value", selector, frameId: this.id, durationMs: duration, sensitive: true });
    return result;
  }

  async isEnabled(selector: string, options: FrameSelectorOptions = {}) {
    await this.waitForSelectorPresence(selector, options, false, `isEnabled ${selector}`);
    return this.evalOnSelector<boolean | null>(selector, options, false, `
      if (!el) {
        return null;
      }
      const disabled = Boolean(el.disabled) || el.hasAttribute("disabled");
      const ariaDisabled = el.getAttribute && el.getAttribute("aria-disabled") === "true";
      return !(disabled || ariaDisabled);
    `);
  }

  async isChecked(selector: string, options: FrameSelectorOptions = {}) {
    await this.waitForSelectorPresence(selector, options, false, `isChecked ${selector}`);
    return this.evalOnSelector<boolean | null>(selector, options, false, `
      if (!el) {
        return null;
      }
      const aria = el.getAttribute && el.getAttribute("aria-checked");
      if (aria === "true") {
        return true;
      }
      if (aria === "false") {
        return false;
      }
      if ("checked" in el) {
        return Boolean(el.checked);
      }
      return null;
    `);
  }

  async count(selector: string, options: FrameSelectorOptions = {}) {
    const parsed = parseSelector(selector);
    const pierce = Boolean(parsed.pierceShadowDom);
    const helpers = serializeShadowDomHelpers();
    const expression = parsed.type === "xpath"
      ? `(function() {
          const result = document.evaluate(${JSON.stringify(parsed.value)}, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
          return result.snapshotLength;
        })()`
      : `(function() {
          const querySelectorAllDeep = ${helpers.querySelectorAllDeep};
          const root = document;
          const selector = ${JSON.stringify(parsed.value)};
          const nodes = ${pierce ? "querySelectorAllDeep(root, selector)" : "root.querySelectorAll(selector)"};
          return nodes.length;
        })()`;

    const params: Record<string, unknown> = {
      expression,
      returnByValue: true
    };
    if (this.contextId) {
      params.contextId = this.contextId;
    }
    const result = await this.session.send<{ result: { value?: number } }>("Runtime.evaluate", params);
    return result.result.value ?? 0;
  }

  async classes(selector: string, options: FrameSelectorOptions = {}) {
    await this.waitForSelectorPresence(selector, options, false, `classes ${selector}`);
    return this.evalOnSelector<string[] | null>(selector, options, false, `
      if (!el) {
        return null;
      }
      if (!el.classList) {
        return [];
      }
      return Array.from(el.classList);
    `);
  }

  async css(selector: string, property: string, options: FrameSelectorOptions = {}) {
    await this.waitForSelectorPresence(selector, options, false, `css ${selector}`);
    return this.evalOnSelector<string | null>(selector, options, false, `
      if (!el) {
        return null;
      }
      const style = window.getComputedStyle(el);
      return style.getPropertyValue(${JSON.stringify(property)}) || "";
    `);
  }

  async hasFocus(selector: string, options: FrameSelectorOptions = {}) {
    await this.waitForSelectorPresence(selector, options, false, `hasFocus ${selector}`);
    return this.evalOnSelector<boolean | null>(selector, options, false, `
      if (!el) {
        return null;
      }
      return document.activeElement === el;
    `);
  }

  async isInViewport(selector: string, options: FrameSelectorOptions = {}, fully = false) {
    await this.waitForSelectorPresence(selector, options, false, `isInViewport ${selector}`);
    return this.evalOnSelector<boolean | null>(selector, options, false, `
      if (!el) {
        return null;
      }
      const rect = el.getBoundingClientRect();
      const viewWidth = window.innerWidth || document.documentElement.clientWidth;
      const viewHeight = window.innerHeight || document.documentElement.clientHeight;
      if (${fully ? "true" : "false"}) {
        return rect.top >= 0 && rect.left >= 0 && rect.bottom <= viewHeight && rect.right <= viewWidth;
      }
      return rect.bottom > 0 && rect.right > 0 && rect.top < viewHeight && rect.left < viewWidth;
    `);
  }

  async isEditable(selector: string, options: FrameSelectorOptions = {}) {
    await this.waitForSelectorPresence(selector, options, false, `isEditable ${selector}`);
    return this.evalOnSelector<boolean | null>(selector, options, false, `
      if (!el) {
        return null;
      }
      const disabled = Boolean(el.disabled) || el.hasAttribute("disabled");
      const readOnly = Boolean(el.readOnly) || el.hasAttribute("readonly");
      const ariaDisabled = el.getAttribute && el.getAttribute("aria-disabled") === "true";
      return !(disabled || readOnly || ariaDisabled);
    `);
  }

  private async performClickLocator(query: LocatorQuery, options: ClickOptions, isDouble: boolean) {
    const start = Date.now();
    const actionName = isDouble ? "dblclick" : "click";
    const description = this.locatorDescription(query);
    this.events.emit("action:start", { name: actionName, selector: description, frameId: this.id });
    const box = await waitFor(async () => {
      const result = await this.resolveLocatorElementBox(query, options);
      if (!result || !result.visible) {
        return null;
      }
      return result;
    }, { timeoutMs: options.timeoutMs ?? this.defaultTimeout, description: `${actionName} ${description}` });

    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    await this.session.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: centerX, y: centerY });
    await this.session.send("Input.dispatchMouseEvent", { type: "mousePressed", x: centerX, y: centerY, button: "left", clickCount: 1, buttons: 1 });
    await this.session.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: centerX, y: centerY, button: "left", clickCount: 1, buttons: 0 });

    if (isDouble) {
      await this.session.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: centerX, y: centerY });
      await this.session.send("Input.dispatchMouseEvent", { type: "mousePressed", x: centerX, y: centerY, button: "left", clickCount: 2, buttons: 1 });
      await this.session.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: centerX, y: centerY, button: "left", clickCount: 2, buttons: 0 });
    }

    const duration = Date.now() - start;
    this.events.emit("action:end", { name: actionName, selector: description, frameId: this.id, durationMs: duration });
    this.logger.debug("Click", description, `${duration}ms`);
  }

  private locatorDescription(query: LocatorQuery) {
    switch (query.kind) {
      case "selector":
        return query.selector;
      case "text":
        return typeof query.text === "string" ? `text=${JSON.stringify(query.text)}` : `text=${query.text.toString()}`;
      case "role":
        return `role=${query.role}${query.options?.name ? ` name=${typeof query.options.name === "string" ? JSON.stringify(query.options.name) : query.options.name.toString()}` : ""}`;
    }
  }

  private async resolveLocatorElementBox(query: LocatorQuery, options: { timeoutMs?: number }): Promise<ElementBox | null> {
    return this.evalOnLocator(query, false, `
      if (!el) {
        return null;
      }
      el.scrollIntoView({ block: "center", inline: "center" });
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        visible: rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none" && Number(style.opacity || "1") > 0
      };
    `);
  }

  private async evalOnLocator<T>(query: LocatorQuery, all: boolean, body: string): Promise<T> {
    const expression = this.buildLocatorExpression(query, body, all);
    const params: Record<string, unknown> = {
      expression,
      returnByValue: true
    };
    if (this.contextId) {
      params.contextId = this.contextId;
    }
    const result = await this.session.send<{ result: { value?: T } }>("Runtime.evaluate", params);
    return result.result.value as T;
  }

  private buildLocatorExpression(query: LocatorQuery, body: string, all = false) {
    const helpers = serializeShadowDomHelpers();
    const serializedQuery = this.serializeLocatorQuery(query);
    return `(function() {
      const querySelectorAllDeep = ${helpers.querySelectorAllDeep};
      const normalizeWhitespace = (value) => String(value ?? "").replace(/\\s+/g, " ").trim();
      const cssEscape = (value) => {
        if (typeof CSS !== "undefined" && CSS.escape) return CSS.escape(value);
        return String(value).replace(/[^a-zA-Z0-9_-]/g, (c) => "\\\\" + c.charCodeAt(0).toString(16) + " ");
      };
      const textFromElement = (el) => {
        if (!el) return "";
        if (el instanceof HTMLInputElement) {
          const type = (el.getAttribute("type") || "").toLowerCase();
          if (type === "button" || type === "submit" || type === "reset" || type === "image") {
            return el.value || el.getAttribute("alt") || "";
          }
        }
        return el.textContent || "";
      };
      const isHidden = (el) => {
        if (!el || !(el instanceof Element)) return true;
        const style = window.getComputedStyle(el);
        if (el.hidden || el.getAttribute("aria-hidden") === "true") return true;
        return style.display === "none" || style.visibility === "hidden" || Number(style.opacity || "1") <= 0;
      };
      const getLabelText = (el) => {
        if (!el || !(el instanceof Element)) return "";
        const ariaLabel = el.getAttribute("aria-label");
        if (ariaLabel) return normalizeWhitespace(ariaLabel);
        const labelledBy = el.getAttribute("aria-labelledby");
        if (labelledBy) {
          const parts = labelledBy.split(/\\s+/).filter(Boolean).map((id) => document.getElementById(id)?.textContent || "");
          const text = normalizeWhitespace(parts.join(" "));
          if (text) return text;
        }
        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
          if (el.id) {
            const label = document.querySelector("label[for=\"" + cssEscape(el.id) + "\"]");
            if (label) {
              const text = normalizeWhitespace(label.textContent || "");
              if (text) return text;
            }
          }
          const wrap = el.closest("label");
          if (wrap) {
            const text = normalizeWhitespace(wrap.textContent || "");
            if (text) return text;
          }
        }
        if (el instanceof HTMLImageElement) {
          return normalizeWhitespace(el.getAttribute("alt") || el.getAttribute("title") || "");
        }
        return normalizeWhitespace(el.getAttribute("title") || "");
      };
      const getImplicitRole = (el) => {
        if (!el || !(el instanceof Element)) return "";
        const explicitRole = (el.getAttribute("role") || "").trim().split(/\\s+/)[0];
        if (explicitRole) return explicitRole;
        const tag = el.tagName.toLowerCase();
        if (tag === "button") return "button";
        if (tag === "summary") return "button";
        if (tag === "a" && el.hasAttribute("href")) return "link";
        if (tag === "input") {
          const type = (el.getAttribute("type") || "text").toLowerCase();
          if (type === "checkbox") return "checkbox";
          if (type === "radio") return "radio";
          if (type === "range") return "slider";
          if (type === "submit" || type === "button" || type === "reset") return "button";
          if (type === "file") return "button";
          return "textbox";
        }
        if (tag === "textarea") return "textbox";
        if (tag === "select") return "combobox";
        if (tag === "img") return "img";
        if (tag === "ul" || tag === "ol") return "list";
        if (tag === "li") return "listitem";
        if (tag === "table") return "table";
        if (tag === "tr") return "row";
        if (tag === "td") return "cell";
        if (tag === "th") return "columnheader";
        if (/^h[1-6]$/.test(tag)) return "heading";
        if (tag === "option") return "option";
        if (tag === "fieldset") return "group";
        if (tag === "form") return "form";
        if (el.hasAttribute("contenteditable")) return "textbox";
        return explicitRole;
      };
      const matchText = (actual, expected, exact) => {
        const normalizedActual = normalizeWhitespace(actual);
        if (expected && expected.kind === "regex") {
          const regex = new RegExp(expected.source, expected.flags);
          return regex.test(normalizedActual);
        }
        const normalizedExpected = normalizeWhitespace(expected.value);
        if (exact) {
          return normalizedActual === normalizedExpected;
        }
        return normalizedActual.toLowerCase().includes(normalizedExpected.toLowerCase());
      };
      const matchName = (actual, expected, exact) => {
        const normalizedActual = normalizeWhitespace(actual);
        if (expected && expected.kind === "regex") {
          const regex = new RegExp(expected.source, expected.flags);
          return regex.test(normalizedActual);
        }
        const normalizedExpected = normalizeWhitespace(expected.value);
        if (exact) {
          return normalizedActual === normalizedExpected;
        }
        return normalizedActual.toLowerCase().includes(normalizedExpected.toLowerCase());
      };
      const query = ${serializedQuery};
      const nodes = Array.from(querySelectorAllDeep(document, "*"));
      const selectorMatches = () => {
        if (query.kind !== "selector") {
          return [];
        }
        if (query.selector.includes(">>>")) {
          return querySelectorAllDeep(document, query.selector);
        }
        if (query.parsed?.type === "xpath") {
          const result = document.evaluate(query.parsed.value, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
          const list = [];
          for (let i = 0; i < result.snapshotLength; i += 1) {
            const item = result.snapshotItem(i);
            if (item instanceof Element) {
              list.push(item);
            }
          }
          return list;
        }
        return Array.from(document.querySelectorAll(query.selector));
      };
      const selectorMatchSet = selectorMatches();
      const matches = nodes.filter((el) => {
        if (!(el instanceof Element)) return false;
        if (query.kind === "selector") {
          return selectorMatchSet.includes(el);
        }
        if (query.kind === "text") {
          const text = textFromElement(el);
          return matchText(text, query.text, Boolean(query.options?.exact));
        }
        const role = getImplicitRole(el);
        if (!role || role !== query.role) {
          return false;
        }
        if (!query.options?.includeHidden && isHidden(el)) {
          return false;
        }
        if (query.options?.name == null) {
          return true;
        }
        const name = getLabelText(el) || textFromElement(el);
        return matchName(name, query.options.name, Boolean(query.options?.exact));
      });
      const textMatches = query.kind === "text"
        ? matches.filter((el) => !matches.some((other) => other !== el && el.contains(other)))
        : matches;
      const elements = ${all ? "textMatches" : "textMatches.slice(0, 1)"};
      const el = elements[0] || null;
      ${body}
    })()`;
  }

  private serializeLocatorQuery(query: LocatorQuery) {
    switch (query.kind) {
      case "selector":
        return JSON.stringify({ kind: "selector", selector: query.selector, options: query.options, parsed: parseSelector(query.selector) });
      case "text":
        return JSON.stringify({
          kind: "text",
          text: this.serializeTextQuery(query.text),
          options: query.options
        });
      case "role":
        return JSON.stringify({
          kind: "role",
          role: query.role,
          options: query.options ? {
            ...query.options,
            name: query.options.name != null ? this.serializeTextQuery(query.options.name) : undefined
          } : undefined
        });
    }
  }

  private serializeTextQuery(text: string | RegExp) {
    if (text instanceof RegExp) {
      return { kind: "regex", source: text.source, flags: text.flags.replace("g", "") };
    }
    return { kind: "string", value: text };
  }

  private async performClick(selector: string, options: ClickOptions, isDouble: boolean) {
    const start = Date.now();
    const actionName = isDouble ? "dblclick" : "click";
    this.events.emit("action:start", { name: actionName, selector, frameId: this.id });
    const box = await waitFor(async () => {
      const result = await this.resolveElementBox(selector, options);
      if (!result || !result.visible) {
        return null;
      }
      return result;
    }, { timeoutMs: options.timeoutMs ?? this.defaultTimeout, description: `${actionName} ${selector}` });

    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    await this.session.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: centerX, y: centerY });
    await this.session.send("Input.dispatchMouseEvent", { type: "mousePressed", x: centerX, y: centerY, button: "left", clickCount: 1, buttons: 1 });
    await this.session.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: centerX, y: centerY, button: "left", clickCount: 1, buttons: 0 });

    if (isDouble) {
      await this.session.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: centerX, y: centerY });
      await this.session.send("Input.dispatchMouseEvent", { type: "mousePressed", x: centerX, y: centerY, button: "left", clickCount: 2, buttons: 1 });
      await this.session.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: centerX, y: centerY, button: "left", clickCount: 2, buttons: 0 });
    }

    const duration = Date.now() - start;
    this.events.emit("action:end", { name: actionName, selector, frameId: this.id, durationMs: duration });
    this.logger.debug("Click", selector, `${duration}ms`);
  }

  private async resolveElementBox(selector: string, options: FrameSelectorOptions): Promise<ElementBox | null> {
    const parsed = parseSelector(selector);
    const pierce = Boolean(parsed.pierceShadowDom);
    const helpers = serializeShadowDomHelpers();
    const expression = parsed.type === "xpath"
      ? `(function() {
          const result = document.evaluate(${JSON.stringify(parsed.value)}, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
          if (!result || !(result instanceof Element)) {
            return null;
          }
          result.scrollIntoView({ block: 'center', inline: 'center' });
          const rect = result.getBoundingClientRect();
          const style = window.getComputedStyle(result);
          return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, visible: rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none' && Number(style.opacity || '1') > 0 };
        })()`
      : `(function() {
          const querySelectorDeep = ${helpers.querySelectorDeep};
          const root = document;
          const selector = ${JSON.stringify(parsed.value)};
          const el = ${pierce ? "querySelectorDeep(root, selector)" : "root.querySelector(selector)"};
          if (!el) {
            return null;
          }
          el.scrollIntoView({ block: 'center', inline: 'center' });
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, visible: rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none' && Number(style.opacity || '1') > 0 };
        })()`;

    const boxParams: Record<string, unknown> = {
      expression,
      returnByValue: true
    };
    if (this.contextId) {
      boxParams.contextId = this.contextId;
    }
    const result = await this.session.send<{ result: { value: ElementBox | null } }>("Runtime.evaluate", boxParams);

    return result?.result?.value ?? null;
  }

  private async querySelectorInternal(selector: string, options: FrameSelectorOptions, forceXPath: boolean): Promise<QueryResult | null> {
    const parsed = forceXPath ? { type: "xpath", value: selector.trim(), pierceShadowDom: undefined } : parseSelector(selector);
    const pierce = Boolean(parsed.pierceShadowDom);
    const helpers = serializeShadowDomHelpers();
    const expression = parsed.type === "xpath"
      ? `(function() {
          const result = document.evaluate(${JSON.stringify(parsed.value)}, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
          return result || null;
        })()`
      : `(function() {
          const querySelectorDeep = ${helpers.querySelectorDeep};
          const root = document;
          const selector = ${JSON.stringify(parsed.value)};
          return ${pierce ? "querySelectorDeep(root, selector)" : "root.querySelector(selector)"};
        })()`;

    const queryParams: Record<string, unknown> = {
      expression,
      returnByValue: false
    };
    if (this.contextId) {
      queryParams.contextId = this.contextId;
    }
    const response = await this.session.send<{ result: { subtype?: string; objectId?: string } }>("Runtime.evaluate", queryParams);

    if (response.result?.subtype === "null" || !response.result?.objectId) {
      return null;
    }

    return { objectId: response.result.objectId, contextId: this.contextId ?? 0 };
  }

  private async querySelectorAllInternal(selector: string, options: FrameSelectorOptions, forceXPath: boolean): Promise<QueryResult[]> {
    const parsed = forceXPath ? { type: "xpath", value: selector.trim(), pierceShadowDom: undefined } : parseSelector(selector);
    const pierce = Boolean(parsed.pierceShadowDom);
    const helpers = serializeShadowDomHelpers();
    const expression = parsed.type === "xpath"
      ? `(function() {
          const result = document.evaluate(${JSON.stringify(parsed.value)}, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
          const nodes = [];
          for (let i = 0; i < result.snapshotLength; i += 1) {
            nodes.push(result.snapshotItem(i));
          }
          return nodes;
        })()`
      : `(function() {
          const querySelectorAllDeep = ${helpers.querySelectorAllDeep};
          const root = document;
          const selector = ${JSON.stringify(parsed.value)};
          return ${pierce ? "querySelectorAllDeep(root, selector)" : "Array.from(root.querySelectorAll(selector))"};
        })()`;

    const listParams: Record<string, unknown> = {
      expression,
      returnByValue: false
    };
    if (this.contextId) {
      listParams.contextId = this.contextId;
    }
    const response = await this.session.send<{ result: { objectId?: string } }>("Runtime.evaluate", listParams);

    if (!response.result?.objectId) {
      return [];
    }

    const properties = await this.session.send<{ result: Array<{ name?: string; value?: { objectId?: string } }> }>("Runtime.getProperties", {
      objectId: response.result.objectId,
      ownProperties: true
    });

    const handles: QueryResult[] = [];
    for (const prop of properties.result) {
      if (prop.name && !/^\d+$/.test(prop.name)) {
        continue;
      }
      const objectId = prop.value?.objectId;
      if (objectId) {
        handles.push({ objectId, contextId: this.contextId ?? 0 });
      }
    }

    await this.releaseObject(response.result.objectId);
    return handles;
  }

  private async evaluateInContext(fnOrString: string | ((...args: any[]) => any), args: any[]): Promise<any> {
    if (typeof fnOrString === "string") {
      const params: Record<string, unknown> = {
        expression: fnOrString,
        returnByValue: true,
        awaitPromise: true
      };
      if (this.contextId) {
        params.contextId = this.contextId;
      }
      const result = await this.session.send<{ result: { value?: unknown } }>("Runtime.evaluate", params);
      return result.result.value;
    }

    const serializedArgs = args.map((arg) => serializeArgument(arg)).join(", ");
    const expression = `(${fnOrString.toString()})(${serializedArgs})`;
    const params: Record<string, unknown> = {
      expression,
      returnByValue: true,
      awaitPromise: true
    };
    if (this.contextId) {
      params.contextId = this.contextId;
    }
    const result = await this.session.send<{ result: { value?: unknown } }>("Runtime.evaluate", params);
    return result.result.value;
  }

  private async releaseObject(objectId: string) {
    try {
      await this.session.send("Runtime.releaseObject", { objectId });
    } catch {
      // ignore release errors
    }
  }

  private buildElementExpression(selector: string, options: FrameSelectorOptions, forceXPath: boolean, body: string) {
    const parsed = forceXPath ? { type: "xpath", value: selector.trim(), pierceShadowDom: undefined } : parseSelector(selector);
    const pierce = options.pierceShadowDom ?? Boolean(parsed.pierceShadowDom);
    const helpers = serializeShadowDomHelpers();
    if (parsed.type === "xpath") {
      return `(function() {
        const el = document.evaluate(${JSON.stringify(parsed.value)}, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        ${body}
      })()`;
    }
    return `(function() {
      const querySelectorDeep = ${helpers.querySelectorDeep};
      const root = document;
      const selector = ${JSON.stringify(parsed.value)};
      const el = ${pierce ? "querySelectorDeep(root, selector)" : "root.querySelector(selector)"};
      ${body}
    })()`;
  }

  private async evalOnSelector<T>(selector: string, options: FrameSelectorOptions, forceXPath: boolean, body: string): Promise<T> {
    const expression = this.buildElementExpression(selector, options, forceXPath, body);
    const params: Record<string, unknown> = {
      expression,
      returnByValue: true
    };
    if (this.contextId) {
      params.contextId = this.contextId;
    }
    const result = await this.session.send<{ result: { value?: T } }>("Runtime.evaluate", params);
    return result.result.value as T;
  }

  private async waitForSelectorPresence(selector: string, options: FrameSelectorOptions, forceXPath: boolean, description: string) {
    const timeoutMs = options.timeoutMs ?? this.defaultTimeout;
    await waitFor(async () => {
      const handle = await this.querySelectorInternal(selector, options, forceXPath);
      if (!handle) {
        return null;
      }
      await this.releaseObject(handle.objectId);
      return handle;
    }, { timeoutMs, description });
  }

  private async waitForLocatorPresence(query: LocatorQuery, timeoutMs: number, description: string) {
    await waitFor(async () => {
      const present = await this.evalOnLocator<boolean | null>(query, false, `
        return Boolean(el);
      `);
      return present ? true : null;
    }, { timeoutMs, description });
  }
}

function serializeArgument(value: unknown) {
  if (value === undefined) {
    return "undefined";
  }
  return JSON.stringify(value);
}
