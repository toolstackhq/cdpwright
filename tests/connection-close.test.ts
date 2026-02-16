import { describe, it, expect } from "vitest";
import { Logger } from "../src/logging/Logger.js";
import { Connection } from "../src/cdp/Connection.js";

describe("cdp connection close handling", () => {
  it("rejects pending commands when the socket closes", async () => {
    const connection = Object.create(Connection.prototype) as any;
    connection.callbacks = new Map();
    connection.sessions = new Map([["s1", {}]]);
    connection.logger = new Logger("error");
    connection.closed = false;

    const pending = new Promise((_, reject) => {
      connection.callbacks.set(1, {
        resolve: () => {},
        reject,
        method: "Runtime.enable",
        start: Date.now()
      });
    });

    connection.onClose(1006, Buffer.from("abnormal close"));

    await expect(pending).rejects.toThrow("CDP socket closed");
    expect(connection.callbacks.size).toBe(0);
    expect(connection.sessions.size).toBe(0);
  });
});
