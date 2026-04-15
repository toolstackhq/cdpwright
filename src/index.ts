import { ChromiumManager, LaunchOptions } from "./browser/ChromiumManager.js";
import { Connection } from "./cdp/Connection.js";
import { Browser, BrowserContext } from "./core/Browser.js";
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

export type WithBrowserCallback<T> = (browser: Browser) => Promise<T> | T;

export type ConnectOptions = {
  logLevel?: LogLevel;
  logger?: Logger;
  logEvents?: boolean;
  logActions?: boolean;
  logAssertions?: boolean;
};

export async function withBrowser<T>(options: AutomatonLaunchOptions, callback: WithBrowserCallback<T>): Promise<T>;
export async function withBrowser<T>(callback: WithBrowserCallback<T>): Promise<T>;
export async function withBrowser<T>(
  optionsOrCallback: AutomatonLaunchOptions | WithBrowserCallback<T>,
  maybeCallback?: WithBrowserCallback<T>
): Promise<T> {
  const options = typeof optionsOrCallback === "function" ? {} : optionsOrCallback;
  const callback = typeof optionsOrCallback === "function" ? optionsOrCallback : maybeCallback;
  if (!callback) {
    throw new Error("withBrowser requires a callback");
  }

  const browser = await automaton.launch(options);
  let callbackError: unknown;
  try {
    return await callback(browser);
  } catch (err) {
    callbackError = err;
    throw err;
  } finally {
    try {
      await browser.close();
    } catch (closeError) {
      if (!callbackError) {
        throw closeError;
      }
    }
  }
}

export const automaton = {
  async launch(options: AutomatonLaunchOptions = {}): Promise<Browser> {
    const manager = new ChromiumManager(options.logger);
    return manager.launch(options);
  },

  withBrowser,

  async connect(wsEndpoint: string, options: ConnectOptions = {}): Promise<Browser> {
    const logger = options.logger ?? new Logger(options.logLevel ?? "warn");
    const connection = new Connection(wsEndpoint, logger);
    await connection.waitForOpen();
    const events = new AutomationEvents();
    const logEvents = options.logEvents ?? true;
    const logActions = options.logActions ?? true;
    const logAssertions = options.logAssertions ?? true;
    if (logEvents && logActions) {
      events.on("action:end", (payload) => {
        const selector = payload.sensitive ? undefined : payload.selector;
        const args: string[] = [];
        if (selector) args.push(selector);
        if (typeof payload.durationMs === "number") args.push(`${payload.durationMs}ms`);
        logger.info(`Action ${payload.name}`, ...args);
      });
    }
    if (logEvents && logAssertions) {
      events.on("assertion:end", (payload) => {
        const args: string[] = [];
        if (payload.selector) args.push(payload.selector);
        if (typeof payload.durationMs === "number") args.push(`${payload.durationMs}ms`);
        logger.info(`Assertion ${payload.name}`, ...args);
      });
    }
    return new Browser(connection, null, logger, events, [], wsEndpoint);
  }
};

export const chromium = automaton;

export { Browser, BrowserContext, Page, Frame, Locator, Logger, LogLevel, AutomationEvents, expect, AssertionError };
