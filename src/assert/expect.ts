import { AssertionError } from "./AssertionError.js";
import { waitFor } from "../core/Waiter.js";
import { Page } from "../core/Page.js";
import { Frame } from "../core/Frame.js";
import { AutomationEvents } from "../core/Events.js";
import { Locator } from "../core/Locator.js";

export type ExpectSelectorOptions = {
  timeoutMs?: number;
};

type ExpectTarget = {
  label: string;
  frameId: string;
  exists(): Promise<boolean>;
  isVisible(): Promise<boolean | null>;
  isEnabled(): Promise<boolean | null>;
  isChecked(): Promise<boolean | null>;
  text(): Promise<string | null>;
  value(): Promise<string | null>;
  attribute(name: string): Promise<string | null>;
  count(): Promise<number>;
  classes(): Promise<string[] | null>;
  css(property: string): Promise<string | null>;
  hasFocus(): Promise<boolean | null>;
  isInViewport(fully?: boolean): Promise<boolean | null>;
  isEditable(): Promise<boolean | null>;
};

class ElementExpectation {
  private target: ExpectTarget;
  private options: ExpectSelectorOptions;
  private negate: boolean;
  private events: AutomationEvents;

  constructor(target: ExpectTarget, options: ExpectSelectorOptions, negate: boolean, events: AutomationEvents) {
    this.target = target;
    this.options = options;
    this.negate = negate;
    this.events = events;
  }

  get not() {
    return new ElementExpectation(this.target, this.options, !this.negate, this.events);
  }

  async toExist() {
    return this.assert(async () => {
      const exists = await this.target.exists();
      return this.negate ? !exists : exists;
    }, this.negate ? "Expected element not to exist" : "Expected element to exist");
  }

  async toBeVisible() {
    return this.assert(async () => {
      const visible = await this.target.isVisible();
      if (visible == null) return this.negate ? true : false;
      return this.negate ? !visible : visible;
    }, this.negate ? "Expected element not to be visible" : "Expected element to be visible");
  }

  async toBeHidden() {
    return this.assert(async () => {
      const visible = await this.target.isVisible();
      if (visible == null) return this.negate ? true : false;
      return this.negate ? visible : !visible;
    }, this.negate ? "Expected element not to be hidden" : "Expected element to be hidden");
  }

  async toBeEnabled() {
    return this.assert(async () => {
      const enabled = await this.target.isEnabled();
      if (enabled == null) {
        return this.negate ? true : false;
      }
      return this.negate ? !enabled : enabled;
    }, this.negate ? "Expected element not to be enabled" : "Expected element to be enabled");
  }

  async toBeDisabled() {
    return this.assert(async () => {
      const enabled = await this.target.isEnabled();
      if (enabled == null) {
        return this.negate ? true : false;
      }
      const disabled = !enabled;
      return this.negate ? !disabled : disabled;
    }, this.negate ? "Expected element not to be disabled" : "Expected element to be disabled");
  }

  async toBeChecked() {
    return this.assert(async () => {
      const checked = await this.target.isChecked();
      if (checked == null) {
        return this.negate ? true : false;
      }
      return this.negate ? !checked : checked;
    }, this.negate ? "Expected element not to be checked" : "Expected element to be checked");
  }

  async toBeUnchecked() {
    return this.assert(async () => {
      const checked = await this.target.isChecked();
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
      const text = await this.target.text();
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
      const text = await this.target.text();
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
      const text = await this.target.text();
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
      const value = await this.target.value();
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
      const value = await this.target.attribute(name);
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
      const count = await this.target.count();
      const matches = count === expected;
      return this.negate ? !matches : matches;
    }, this.negate ? "Expected element count not to match" : "Expected element count to match", { expected });
  }

  async toHaveClass(nameOrRegex: string | RegExp) {
    const expected = nameOrRegex;
    return this.assert(async () => {
      const classes = await this.target.classes();
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
      const classes = await this.target.classes();
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
      const value = await this.target.css(property);
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
      const focused = await this.target.hasFocus();
      if (focused == null) {
        return this.negate ? true : false;
      }
      return this.negate ? !focused : focused;
    }, this.negate ? "Expected element not to have focus" : "Expected element to have focus");
  }

  async toBeInViewport(options: { fully?: boolean } = {}) {
    return this.assert(async () => {
      const inViewport = await this.target.isInViewport(Boolean(options.fully));
      if (inViewport == null) {
        return this.negate ? true : false;
      }
      return this.negate ? !inViewport : inViewport;
    }, this.negate ? "Expected element not to be in viewport" : "Expected element to be in viewport");
  }

  async toBeEditable() {
    return this.assert(async () => {
      const editable = await this.target.isEditable();
      if (editable == null) {
        return this.negate ? true : false;
      }
      return this.negate ? !editable : editable;
    }, this.negate ? "Expected element not to be editable" : "Expected element to be editable");
  }

  private async assert(predicate: () => Promise<boolean>, message: string, details: Record<string, unknown> = {}) {
    const timeoutMs = this.options.timeoutMs ?? 30_000;
    const start = Date.now();
    this.events.emit("assertion:start", { name: message, selector: this.target.label, frameId: this.target.frameId });

    let lastState: unknown;
    try {
      await waitFor(async () => {
        const result = await predicate();
        lastState = result;
        return result;
      }, { timeoutMs, description: message });
    } catch {
      const duration = Date.now() - start;
      this.events.emit("assertion:end", { name: message, selector: this.target.label, frameId: this.target.frameId, durationMs: duration, status: "failed" });
      throw new AssertionError(message, { selector: this.target.label, timeoutMs, lastState: { lastState, ...details } });
    }

    const duration = Date.now() - start;
    this.events.emit("assertion:end", { name: message, selector: this.target.label, frameId: this.target.frameId, durationMs: duration, status: "passed" });
  }
}

function frameTarget(frame: Frame, selector: string, options: ExpectSelectorOptions): ExpectTarget {
  return {
    label: selector,
    frameId: frame.id,
    exists: () => frame.exists(selector, options),
    isVisible: () => frame.isVisible(selector, options),
    isEnabled: () => frame.isEnabled(selector, options),
    isChecked: () => frame.isChecked(selector, options),
    text: () => frame.text(selector, options),
    value: () => frame.value(selector, options),
    attribute: (name: string) => frame.attribute(selector, name, options),
    count: () => frame.count(selector, options),
    classes: () => frame.classes(selector, options),
    css: (property: string) => frame.css(selector, property, options),
    hasFocus: () => frame.hasFocus(selector, options),
    isInViewport: (fully = false) => frame.isInViewport(selector, options, fully),
    isEditable: () => frame.isEditable(selector, options)
  };
}

function locatorTarget(locator: Locator): ExpectTarget {
  return {
    label: locator.describe(),
    frameId: locator.getFrameId(),
    exists: () => locator.exists(),
    isVisible: () => locator.isVisible(),
    isEnabled: () => locator.isEnabled(),
    isChecked: () => locator.isChecked(),
    text: () => locator.text(),
    value: () => locator.value(),
    attribute: (name: string) => locator.attribute(name),
    count: () => locator.count(),
    classes: () => locator.classes(),
    css: (property: string) => locator.css(property),
    hasFocus: () => locator.hasFocus(),
    isInViewport: (fully = false) => locator.isInViewport(fully),
    isEditable: () => locator.isEditable()
  };
}

class ExpectFrame {
  private frame: Frame;
  private events: AutomationEvents;

  constructor(frame: Frame, events: AutomationEvents) {
    this.frame = frame;
    this.events = events;
  }

  element(selector: string, options: ExpectSelectorOptions = {}) {
    return new ElementExpectation(frameTarget(this.frame, selector, options), options, false, this.events);
  }
}

export function expect(page: Page): { element: (selector: string, options?: ExpectSelectorOptions) => ElementExpectation; frame: (options: { name?: string; urlIncludes?: string; predicate?: (frame: Frame) => boolean }) => ExpectFrame };
export function expect(locator: Locator): ElementExpectation;
export function expect(target: Page | Locator) {
  if (target instanceof Locator) {
    return new ElementExpectation(locatorTarget(target), {}, false, target.getEvents());
  }
  return {
    element: (selector: string, options: ExpectSelectorOptions = {}) => new ElementExpectation(frameTarget(target.mainFrame(), selector, options), options, false, target.getEvents()),
    frame: (options: { name?: string; urlIncludes?: string; predicate?: (frame: Frame) => boolean }) => {
      const frame = target.frame(options);
      if (!frame) {
        throw new AssertionError("Frame not found", { selector: JSON.stringify(options) });
      }
      return new ExpectFrame(frame, target.getEvents());
    }
  };
}

export type { ElementExpectation, ExpectFrame };

// Convenience: page.expect().element("selector") or page.expect("selector").toExist()
declare module "../core/Page.js" {
  interface Page {
    expect(): ReturnType<typeof expect>;
    expect(selector: string, options?: ExpectSelectorOptions): ElementExpectation;
    expect(locator: Locator): ElementExpectation;
    find: {
      locators: (options?: { highlight?: boolean; outputPath?: string; outputJson?: string; outputHtml?: string }) => Promise<any[]>;
    };
    findLocators(options?: { highlight?: boolean; outputPath?: string; outputJson?: string; outputHtml?: string }): Promise<any[]>;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(Page.prototype as any).expect = function(target?: string | Locator, options?: ExpectSelectorOptions) {
  const builder = expect(this as Page);
  if (target instanceof Locator) {
    return expect(target);
  }
  if (target) {
    return builder.element(target, options);
  }
  return builder;
};

Object.defineProperty(Page.prototype, "find", {
  get: function() {
    return {
      locators: (options?: { highlight?: boolean; outputPath?: string; outputJson?: string; outputHtml?: string }) =>
        (this as Page).findLocators(options)
    };
  }
});
