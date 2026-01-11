import { ChromiumManager, LaunchOptions } from "./browser/ChromiumManager.js";
import { Browser } from "./core/Browser.js";
import { Page } from "./core/Page.js";
import { Frame } from "./core/Frame.js";
import { Locator } from "./core/Locator.js";
import { Logger, LogLevel } from "./logging/Logger.js";
import { AutomationEvents } from "./core/Events.js";
import { expect } from "./assert/expect.js";
import { AssertionError } from "./assert/AssertionError.js";

export type AutomatonLaunchOptions = LaunchOptions & {
  logger?: Logger;
};

export const automaton = {
  async launch(options: AutomatonLaunchOptions = {}): Promise<Browser> {
    const manager = new ChromiumManager(options.logger);
    return manager.launch(options);
  }
};

export { Browser, Page, Frame, Locator, Logger, LogLevel, AutomationEvents, expect, AssertionError };
