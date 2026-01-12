import { ChildProcess } from "child_process";
import { Connection } from "../cdp/Connection.js";
import { Session } from "../cdp/Session.js";
import { Logger } from "../logging/Logger.js";
import { AutomationEvents } from "./Events.js";
import { Page } from "./Page.js";

export class Browser {
  private connection: Connection;
  private process: ChildProcess;
  private logger: Logger;
  private events: AutomationEvents;
  private cleanupTasks: Array<() => void>;

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

  async newPage() {
    const { targetId } = await this.connection.send<{ targetId: string }>("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await this.connection.send<{ sessionId: string }>("Target.attachToTarget", { targetId, flatten: true });
    const session = this.connection.createSession(sessionId);
    const page = new Page(session, this.logger, this.events);
    await page.initialize();
    return page;
  }

  async close() {
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
