import WebSocket from "ws";
import { EventEmitter } from "events";
import { Logger } from "../logging/Logger.js";
import { Session } from "./Session.js";

export type CDPResponse = {
  id: number;
  result?: unknown;
  error?: { message: string; data?: unknown };
  sessionId?: string;
};

export type CDPEvent = {
  method: string;
  params?: unknown;
  sessionId?: string;
};

export class Connection {
  private ws: WebSocket;
  private id = 0;
  private callbacks = new Map<number, { resolve: (value: unknown) => void; reject: (reason?: unknown) => void; method: string; start: number }>();
  private sessions = new Map<string, Session>();
  private emitter = new EventEmitter();
  private logger: Logger;

  constructor(url: string, logger: Logger) {
    this.logger = logger;
    this.ws = new WebSocket(url);
    this.ws.on("message", (data: WebSocket.RawData) => this.onMessage(data.toString()));
    this.ws.on("error", (err: Error) => this.onError(err));
  }

  async waitForOpen() {
    if (this.ws.readyState === WebSocket.OPEN) {
      return;
    }
    await new Promise<void>((resolve, reject) => {
      this.ws.once("open", () => resolve());
      this.ws.once("error", (err: Error) => reject(err));
    });
  }

  createSession(sessionId: string): Session {
    const session = new Session(this, sessionId);
    this.sessions.set(sessionId, session);
    return session;
  }

  removeSession(sessionId: string) {
    this.sessions.delete(sessionId);
  }

  on(event: string, handler: (params: unknown) => void) {
    this.emitter.on(event, handler);
  }

  async send<T = unknown>(method: string, params: Record<string, unknown> = {}, sessionId?: string): Promise<T> {
    await this.waitForOpen();
    const id = ++this.id;
    const payload = sessionId ? { id, method, params, sessionId } : { id, method, params };
    const start = Date.now();
    const promise = new Promise<T>((resolve, reject) => {
      this.callbacks.set(id, { resolve: resolve as (value: unknown) => void, reject, method, start });
    });
    if (this.logger) {
      this.logger.trace("CDP send", method);
    }
    this.ws.send(JSON.stringify(payload));
    return promise;
  }

  async close() {
    if (this.ws.readyState === WebSocket.CLOSED) {
      return;
    }
    await new Promise<void>((resolve) => {
      this.ws.once("close", () => resolve());
      this.ws.close();
    });
  }

  private onError(err: unknown) {
    this.logger.error("CDP socket error", err);
  }

  private onMessage(message: string) {
    const parsed = JSON.parse(message) as CDPResponse & CDPEvent;
    if (typeof parsed.id === "number") {
      const callback = this.callbacks.get(parsed.id);
      if (!callback) {
        return;
      }
      this.callbacks.delete(parsed.id);
      const duration = Date.now() - callback.start;
      this.logger.debug("CDP recv", callback.method, `${duration}ms`);
      if (parsed.error) {
        callback.reject(new Error(parsed.error.message));
      } else {
        callback.resolve(parsed.result);
      }
      return;
    }

    if (parsed.sessionId) {
      const session = this.sessions.get(parsed.sessionId);
      if (session) {
        session.dispatch(parsed.method, parsed.params);
      }
      return;
    }

    if (parsed.method) {
      this.emitter.emit(parsed.method, parsed.params);
    }
  }
}
