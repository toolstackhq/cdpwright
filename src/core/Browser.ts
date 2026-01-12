import { ChildProcess } from "child_process";
import { Connection } from "../cdp/Connection.js";
import { Session } from "../cdp/Session.js";
import { Logger } from "../logging/Logger.js";
import { AutomationEvents } from "./Events.js";
import { Page } from "./Page.js";

export class BrowserContext {
  private browser: Browser;
  private id: string;

  constructor(browser: Browser, id: string) {
    this.browser = browser;
    this.id = id;
  }

  getId() {
    return this.id;
  }

  async newPage() {
    return this.browser.newPage({ browserContextId: this.id });
  }

  async close() {
    await this.browser.disposeContext(this.id);
  }
}

export class Browser {
  private connection: Connection;
  private process: ChildProcess;
  private logger: Logger;
  private events: AutomationEvents;
  private cleanupTasks: Array<() => void>;
  private contexts = new Set<string>();

  constructor(connection: Connection, child: ChildProcess, logger: Logger, events: AutomationEvents, cleanupTasks: Array<() => void> = []) {
    this.connection = connection;
    this.process = child;
    this.logger = logger;
    this.events = events;
    this.cleanupTasks = cleanupTasks;
  }

  on(event: "action:start" | "action:end" | "assertion:start" | "assertion:end", handler: (payload: any) => void) {
    this.events.on(event, handler as any);
  }

  async newContext() {
    const { browserContextId } = await this.connection.send<{ browserContextId: string }>("Target.createBrowserContext");
    this.contexts.add(browserContextId);
    return new BrowserContext(this, browserContextId);
  }

  async newPage(options: { browserContextId?: string } = {}) {
    const { browserContextId } = options;
    const { targetId } = await this.connection.send<{ targetId: string }>("Target.createTarget", {
      url: "about:blank",
      browserContextId
    });
    const { sessionId } = await this.connection.send<{ sessionId: string }>("Target.attachToTarget", { targetId, flatten: true });
    const session = this.connection.createSession(sessionId);
    const page = new Page(session, this.logger, this.events);
    await page.initialize();
    return page;
  }

  async disposeContext(contextId: string) {
    if (!contextId) return;
    try {
      await this.connection.send("Target.disposeBrowserContext", { browserContextId: contextId });
    } catch {
      // ignore dispose failures
    }
    this.contexts.delete(contextId);
  }

  async close() {
    if (this.contexts.size > 0) {
      for (const contextId of Array.from(this.contexts)) {
        await this.disposeContext(contextId);
      }
    }
    try {
      await this.connection.send("Browser.close");
    } catch {
      // ignore
    }
    await this.connection.close();
    if (!this.process.killed) {
      this.process.kill();
    }
    for (const task of this.cleanupTasks) {
      try {
        task();
      } catch {
        // ignore cleanup errors
      }
    }
  }
}
