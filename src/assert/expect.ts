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

  async toBeHidden() {
    return this.assert(async () => {
      const visible = await this.frame.isVisible(this.selector, this.options);
      return this.negate ? visible : !visible;
    }, this.negate ? "Expected element not to be hidden" : "Expected element to be hidden");
  }

  async toBeEnabled() {
    return this.assert(async () => {
      const enabled = await this.frame.isEnabled(this.selector, this.options);
      if (enabled == null) {
        return this.negate ? true : false;
      }
      return this.negate ? !enabled : enabled;
    }, this.negate ? "Expected element not to be enabled" : "Expected element to be enabled");
  }

  async toBeDisabled() {
    return this.assert(async () => {
      const enabled = await this.frame.isEnabled(this.selector, this.options);
      if (enabled == null) {
        return this.negate ? true : false;
      }
      const disabled = !enabled;
      return this.negate ? !disabled : disabled;
    }, this.negate ? "Expected element not to be disabled" : "Expected element to be disabled");
  }

  async toBeChecked() {
    return this.assert(async () => {
      const checked = await this.frame.isChecked(this.selector, this.options);
      if (checked == null) {
        return this.negate ? true : false;
      }
      return this.negate ? !checked : checked;
    }, this.negate ? "Expected element not to be checked" : "Expected element to be checked");
  }

  async toBeUnchecked() {
    return this.assert(async () => {
      const checked = await this.frame.isChecked(this.selector, this.options);
      if (checked == null) {
        return this.negate ? true : false;
      }
      const unchecked = !checked;
      return this.negate ? !unchecked : unchecked;
    }, this.negate ? "Expected element not to be unchecked" : "Expected element to be unchecked");
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

  async toHaveExactText(textOrRegex: string | RegExp) {
    const expected = textOrRegex;
    return this.assert(async () => {
      const text = await this.frame.text(this.selector, this.options);
      if (text == null) {
        return this.negate ? true : false;
      }
      const matches = expected instanceof RegExp
        ? new RegExp(expected.source, expected.flags.replace("g", "")).test(text)
        : text === expected;
      return this.negate ? !matches : matches;
    }, this.negate ? "Expected element text not to match exactly" : "Expected element text to match exactly", { expected });
  }

  async toContainText(textOrRegex: string | RegExp) {
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
    }, this.negate ? "Expected element text not to contain" : "Expected element text to contain", { expected });
  }

  async toHaveValue(valueOrRegex: string | RegExp) {
    const expected = valueOrRegex;
    return this.assert(async () => {
      const value = await this.frame.value(this.selector, this.options);
      if (value == null) {
        return this.negate ? true : false;
      }
      const matches = expected instanceof RegExp
        ? new RegExp(expected.source, expected.flags.replace("g", "")).test(value)
        : value === expected;
      return this.negate ? !matches : matches;
    }, this.negate ? "Expected element value not to match" : "Expected element value to match", { expected });
  }

  async toHaveAttribute(name: string, valueOrRegex?: string | RegExp) {
    const expected = valueOrRegex;
    return this.assert(async () => {
      const value = await this.frame.attribute(this.selector, name, this.options);
      if (expected === undefined) {
        const exists = value != null;
        return this.negate ? !exists : exists;
      }
      if (value == null) {
        return this.negate ? true : false;
      }
      const matches = expected instanceof RegExp
        ? new RegExp(expected.source, expected.flags.replace("g", "")).test(value)
        : value === expected;
      return this.negate ? !matches : matches;
    }, this.negate ? "Expected element attribute not to match" : "Expected element attribute to match", { expected, name });
  }

  async toHaveId(idOrRegex: string | RegExp) {
    return this.toHaveAttribute("id", idOrRegex);
  }

  async toHaveName(nameOrRegex: string | RegExp) {
    return this.toHaveAttribute("name", nameOrRegex);
  }

  async toHaveCount(expected: number) {
    return this.assert(async () => {
      const count = await this.frame.count(this.selector, this.options);
      const matches = count === expected;
      return this.negate ? !matches : matches;
    }, this.negate ? "Expected element count not to match" : "Expected element count to match", { expected });
  }

  async toHaveClass(nameOrRegex: string | RegExp) {
    const expected = nameOrRegex;
    return this.assert(async () => {
      const classes = await this.frame.classes(this.selector, this.options);
      if (classes == null) {
        return this.negate ? true : false;
      }
      const matches = expected instanceof RegExp
        ? classes.some((value) => new RegExp(expected.source, expected.flags.replace("g", "")).test(value))
        : classes.includes(expected);
      return this.negate ? !matches : matches;
    }, this.negate ? "Expected element class not to match" : "Expected element class to match", { expected });
  }

  async toHaveClasses(expected: string[]) {
    return this.assert(async () => {
      const classes = await this.frame.classes(this.selector, this.options);
      if (classes == null) {
        return this.negate ? true : false;
      }
      const matches = expected.every((value) => classes.includes(value));
      return this.negate ? !matches : matches;
    }, this.negate ? "Expected element classes not to match" : "Expected element classes to match", { expected });
  }

  async toHaveCss(property: string, valueOrRegex: string | RegExp) {
    const expected = valueOrRegex;
    return this.assert(async () => {
      const value = await this.frame.css(this.selector, property, this.options);
      if (value == null) {
        return this.negate ? true : false;
      }
      const actual = value.trim();
      const matches = expected instanceof RegExp
        ? new RegExp(expected.source, expected.flags.replace("g", "")).test(actual)
        : actual === expected;
      return this.negate ? !matches : matches;
    }, this.negate ? "Expected element css not to match" : "Expected element css to match", { expected, property });
  }

  async toHaveFocus() {
    return this.assert(async () => {
      const focused = await this.frame.hasFocus(this.selector, this.options);
      if (focused == null) {
        return this.negate ? true : false;
      }
      return this.negate ? !focused : focused;
    }, this.negate ? "Expected element not to have focus" : "Expected element to have focus");
  }

  async toBeInViewport(options: { fully?: boolean } = {}) {
    return this.assert(async () => {
      const inViewport = await this.frame.isInViewport(this.selector, this.options, Boolean(options.fully));
      if (inViewport == null) {
        return this.negate ? true : false;
      }
      return this.negate ? !inViewport : inViewport;
    }, this.negate ? "Expected element not to be in viewport" : "Expected element to be in viewport");
  }

  async toBeEditable() {
    return this.assert(async () => {
      const editable = await this.frame.isEditable(this.selector, this.options);
      if (editable == null) {
        return this.negate ? true : false;
      }
      return this.negate ? !editable : editable;
    }, this.negate ? "Expected element not to be editable" : "Expected element to be editable");
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
