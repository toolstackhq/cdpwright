import type { Frame } from "./Frame.js";

export type LocatorOptions = {
  pierceShadowDom?: boolean;
};

export class Locator {
  private frame: Frame;
  private selector: string;
  private options: LocatorOptions;

  constructor(frame: Frame, selector: string, options: LocatorOptions = {}) {
    this.frame = frame;
    this.selector = selector;
    this.options = options;
  }

  async click(options: { timeoutMs?: number } = {}) {
    return this.frame.click(this.selector, { ...this.options, ...options });
  }

  async dblclick(options: { timeoutMs?: number } = {}) {
    return this.frame.dblclick(this.selector, { ...this.options, ...options });
  }

  async type(text: string, options: { timeoutMs?: number } = {}) {
    return this.frame.type(this.selector, text, { ...this.options, ...options });
  }

  async exists() {
    return this.frame.exists(this.selector, this.options);
  }

  async text() {
    return this.frame.text(this.selector, this.options);
  }
}
