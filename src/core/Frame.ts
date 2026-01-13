import { Session } from "../cdp/Session.js";
import { Logger } from "../logging/Logger.js";
import { AutomationEvents } from "./Events.js";
import { waitFor } from "./Waiter.js";
import { parseSelector } from "./Selectors.js";
import { serializeShadowDomHelpers } from "./ShadowDom.js";
import { Locator } from "./Locator.js";

export type FrameSelectorOptions = {};

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
    return new Locator(this, selector, options);
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

  async text(selector: string, options: FrameSelectorOptions = {}) {
    const helpers = serializeShadowDomHelpers();
    const expression = `(function() {
      const querySelectorDeep = ${helpers.querySelectorDeep};
      const root = document;
      const selector = ${JSON.stringify(selector)};
      const el = ${options.pierceShadowDom ? "querySelectorDeep(root, selector)" : "root.querySelector(selector)"};
      return el ? el.textContent || \"\" : null;
    })()`;

    const params: Record<string, unknown> = {
      expression,
      returnByValue: true
    };
    if (this.contextId) {
      params.contextId = this.contextId;
    }
    const result = await this.session.send<{ result: { value?: string | null } }>("Runtime.evaluate", params);
    return result.result.value ?? null;
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
    return this.evalOnSelector<string | null>(selector, options, false, `
      if (!el || !(el instanceof Element)) {
        return null;
      }
      return el.getAttribute(${JSON.stringify(name)});
    `);
  }

  async value(selector: string, options: FrameSelectorOptions = {}) {
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
    return this.evalOnSelector<string | null>(selector, options, false, `
      if (!el) {
        return null;
      }
      const style = window.getComputedStyle(el);
      return style.getPropertyValue(${JSON.stringify(property)}) || "";
    `);
  }

  async hasFocus(selector: string, options: FrameSelectorOptions = {}) {
    return this.evalOnSelector<boolean | null>(selector, options, false, `
      if (!el) {
        return null;
      }
      return document.activeElement === el;
    `);
  }

  async isInViewport(selector: string, options: FrameSelectorOptions = {}, fully = false) {
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
    const pierce = Boolean(parsed.pierceShadowDom);
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
}

function serializeArgument(value: unknown) {
  if (value === undefined) {
    return "undefined";
  }
  return JSON.stringify(value);
}
