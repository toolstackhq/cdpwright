import { EventEmitter } from "events";
import { Connection } from "./Connection.js";

export class Session {
  private connection: Connection;
  private sessionId: string;
  private emitter = new EventEmitter();

  constructor(connection: Connection, sessionId: string) {
    this.connection = connection;
    this.sessionId = sessionId;
  }

  on(event: string, handler: (params: unknown) => void) {
    this.emitter.on(event, handler);
  }

  once(event: string, handler: (params: unknown) => void) {
    this.emitter.once(event, handler);
  }

  async send<T = unknown>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    return this.connection.send<T>(method, params, this.sessionId);
  }

  dispatch(method: string, params: unknown) {
    this.emitter.emit(method, params);
  }
}
