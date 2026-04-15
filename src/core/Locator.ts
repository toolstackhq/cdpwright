import type { Frame } from "./Frame.js";

export type SelectorLocatorOptions = {
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

export type LocatorQuery =
  | { kind: "selector"; selector: string; options?: SelectorLocatorOptions }
  | { kind: "text"; text: string | RegExp; options?: TextLocatorOptions }
  | { kind: "role"; role: string; options?: RoleLocatorOptions };

export class Locator {
  private frame: Frame;
  private query: LocatorQuery;

  constructor(frame: Frame, query: LocatorQuery) {
    this.frame = frame;
    this.query = query;
  }

  getEvents() {
    return this.frame.getEvents();
  }

  getFrameId() {
    return this.frame.id;
  }

  describe() {
    switch (this.query.kind) {
      case "selector":
        return this.query.selector;
      case "text":
        return typeof this.query.text === "string" ? `text=${JSON.stringify(this.query.text)}` : `text=${this.query.text.toString()}`;
      case "role":
        return `role=${this.query.role}${this.query.options?.name ? ` name=${typeof this.query.options.name === "string" ? JSON.stringify(this.query.options.name) : this.query.options.name.toString()}` : ""}`;
    }
  }

  async click(options: { timeoutMs?: number } = {}) {
    return this.frame.clickLocator(this.query, { ...this.queryTimeoutOptions(), ...options });
  }

  async dblclick(options: { timeoutMs?: number } = {}) {
    return this.frame.dblclickLocator(this.query, { ...this.queryTimeoutOptions(), ...options });
  }

  async fill(value: string, options: { timeoutMs?: number } = {}) {
    if (this.query.kind === "selector") {
      return this.frame.fill(this.query.selector, value, { ...this.queryTimeoutOptions(), ...options });
    }
    return this.frame.fillLocator(this.query, value, { ...this.queryTimeoutOptions(), ...options });
  }

  async clear(options: { timeoutMs?: number } = {}) {
    if (this.query.kind === "selector") {
      return this.frame.clear(this.query.selector, { ...this.queryTimeoutOptions(), ...options });
    }
    return this.frame.clearLocator(this.query, { ...this.queryTimeoutOptions(), ...options });
  }

  async type(text: string, options: { timeoutMs?: number } = {}) {
    return this.frame.typeLocator(this.query, text, { ...this.queryTimeoutOptions(), ...options });
  }

  async focus(options: { timeoutMs?: number } = {}) {
    if (this.query.kind === "selector") {
      return this.frame.focus(this.query.selector, { ...this.queryTimeoutOptions(), ...options });
    }
    return this.frame.focusLocator(this.query, { ...this.queryTimeoutOptions(), ...options });
  }

  async blur(options: { timeoutMs?: number } = {}) {
    if (this.query.kind === "selector") {
      return this.frame.blur(this.query.selector, { ...this.queryTimeoutOptions(), ...options });
    }
    return this.frame.blurLocator(this.query, { ...this.queryTimeoutOptions(), ...options });
  }

  async hover(options: { timeoutMs?: number } = {}) {
    if (this.query.kind === "selector") {
      return this.frame.hover(this.query.selector, { ...this.queryTimeoutOptions(), ...options });
    }
    return this.frame.hoverLocator(this.query, { ...this.queryTimeoutOptions(), ...options });
  }

  async press(key: string, options: { timeoutMs?: number } = {}) {
    if (this.query.kind === "selector") {
      return this.frame.press(this.query.selector, key, { ...this.queryTimeoutOptions(), ...options });
    }
    return this.frame.pressLocator(this.query, key, { ...this.queryTimeoutOptions(), ...options });
  }

  async selectText(options: { timeoutMs?: number } = {}) {
    if (this.query.kind === "selector") {
      return this.frame.selectText(this.query.selector, { ...this.queryTimeoutOptions(), ...options });
    }
    return this.frame.selectTextLocator(this.query, { ...this.queryTimeoutOptions(), ...options });
  }

  async scrollIntoViewIfNeeded(options: { timeoutMs?: number } = {}) {
    if (this.query.kind === "selector") {
      return this.frame.scrollIntoViewIfNeeded(this.query.selector, { ...this.queryTimeoutOptions(), ...options });
    }
    return this.frame.scrollIntoViewIfNeededLocator(this.query, { ...this.queryTimeoutOptions(), ...options });
  }

  async check(options: { timeoutMs?: number } = {}) {
    if (this.query.kind === "selector") {
      return this.frame.check(this.query.selector, { ...this.queryTimeoutOptions(), ...options });
    }
    return this.frame.checkLocator(this.query, { ...this.queryTimeoutOptions(), ...options });
  }

  async uncheck(options: { timeoutMs?: number } = {}) {
    if (this.query.kind === "selector") {
      return this.frame.uncheck(this.query.selector, { ...this.queryTimeoutOptions(), ...options });
    }
    return this.frame.uncheckLocator(this.query, { ...this.queryTimeoutOptions(), ...options });
  }

  async setChecked(checked: boolean, options: { timeoutMs?: number } = {}) {
    if (this.query.kind === "selector") {
      return this.frame.setChecked(this.query.selector, checked, { ...this.queryTimeoutOptions(), ...options });
    }
    return this.frame.setCheckedLocator(this.query, checked, { ...this.queryTimeoutOptions(), ...options });
  }

  async setInputFiles(files: string | string[] | { name: string; contents: string | Buffer; mimeType?: string } | Array<{ name: string; contents: string | Buffer; mimeType?: string }>, options: { timeoutMs?: number; mimeType?: string } = {}) {
    if (this.query.kind === "selector") {
      return this.frame.setInputFiles(this.query.selector, files, { ...this.queryTimeoutOptions(), ...options });
    }
    return this.frame.setInputFilesLocator(this.query, files, { ...this.queryTimeoutOptions(), ...options });
  }

  async exists() {
    return this.frame.existsLocator(this.query);
  }

  async isVisible() {
    return this.frame.isVisibleLocator(this.query);
  }

  async isEnabled() {
    return this.frame.isEnabledLocator(this.query);
  }

  async isChecked() {
    return this.frame.isCheckedLocator(this.query);
  }

  async text() {
    return this.frame.textLocator(this.query);
  }

  async value() {
    return this.frame.valueLocator(this.query);
  }

  async attribute(name: string) {
    return this.frame.attributeLocator(this.query, name);
  }

  async classes() {
    return this.frame.classesLocator(this.query);
  }

  async css(property: string) {
    return this.frame.cssLocator(this.query, property);
  }

  async hasFocus() {
    return this.frame.hasFocusLocator(this.query);
  }

  async isInViewport(fully = false) {
    return this.frame.isInViewportLocator(this.query, fully);
  }

  async isEditable() {
    return this.frame.isEditableLocator(this.query);
  }

  async count() {
    return this.frame.countLocator(this.query);
  }

  private queryTimeoutOptions() {
    return "options" in this.query && this.query.options?.timeoutMs ? { timeoutMs: this.query.options.timeoutMs } : {};
  }
}
