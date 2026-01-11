import { AssertionError } from "./AssertionError.js";
import { waitFor } from "../core/Waiter.js";
import { Page } from "../core/Page.js";
import { Frame } from "../core/Frame.js";
import { AutomationEvents } from "../core/Events.js";

export type ExpectSelectorOptions = {
  timeoutMs?: number;
  pierceShadowDom?: boolean;
};

class ElementExpectation {
  private frame: Frame;
  private selector: string;
  private options: ExpectSelectorOptions;
  private negate: boolean;
  private events: AutomationEvents;

  constructor(frame: Frame, selector: string, options: ExpectSelectorOptions, negate: boolean, events: AutomationEvents) {
    this.frame = frame;
    this.selector = selector;
    this.options = options;
    this.negate = negate;
    this.events = events;
  }

  get not() {
    return new ElementExpectation(this.frame, this.selector, this.options, !this.negate, this.events);
  }

  async toExist() {
    return this.assert(async () => {
      const exists = await this.frame.exists(this.selector, this.options);
      return this.negate ? !exists : exists;
    }, this.negate ? "Expected element not to exist" : "Expected element to exist");
  }

  async toBeVisible() {
    return this.assert(async () => {
      const visible = await this.frame.isVisible(this.selector, this.options);
      return this.negate ? !visible : visible;
    }, this.negate ? "Expected element not to be visible" : "Expected element to be visible");
  }

  async toHaveText(textOrRegex: string | RegExp) {
    const expected = textOrRegex;
    return this.assert(async () => {
      const text = await this.frame.text(this.selector, this.options);
      if (text == null) {
        return this.negate ? true : false;
      }
      const matches = expected instanceof RegExp
        ? new RegExp(expected.source, expected.flags.replace("g", "")).test(text)
        : text.includes(expected);
      return this.negate ? !matches : matches;
    }, this.negate ? "Expected element text not to match" : "Expected element text to match", { expected });
  }

  private async assert(predicate: () => Promise<boolean>, message: string, details: Record<string, unknown> = {}) {
    const timeoutMs = this.options.timeoutMs ?? 30_000;
    const start = Date.now();
    this.events.emit("assertion:start", { name: message, selector: this.selector, frameId: this.frame.id });

    let lastState: unknown;
    try {
      await waitFor(async () => {
        const result = await predicate();
        lastState = result;
        return result;
      }, { timeoutMs, description: message });
    } catch {
      const duration = Date.now() - start;
      this.events.emit("assertion:end", { name: message, selector: this.selector, frameId: this.frame.id, durationMs: duration });
      throw new AssertionError(message, { selector: this.selector, timeoutMs, lastState: { lastState, ...details } });
    }

    const duration = Date.now() - start;
    this.events.emit("assertion:end", { name: message, selector: this.selector, frameId: this.frame.id, durationMs: duration });
  }
}

class ExpectFrame {
  private frame: Frame;
  private events: AutomationEvents;

  constructor(frame: Frame, events: AutomationEvents) {
    this.frame = frame;
    this.events = events;
  }

  element(selector: string, options: ExpectSelectorOptions = {}) {
    return new ElementExpectation(this.frame, selector, options, false, this.events);
  }
}

export function expect(page: Page) {
  return {
    element: (selector: string, options: ExpectSelectorOptions = {}) => new ElementExpectation(page.mainFrame(), selector, options, false, page.getEvents()),
    frame: (options: { name?: string; urlIncludes?: string; predicate?: (frame: Frame) => boolean }) => {
      const frame = page.frame(options);
      if (!frame) {
        throw new AssertionError("Frame not found", { selector: JSON.stringify(options) });
      }
      return new ExpectFrame(frame, page.getEvents());
    }
  };
}
