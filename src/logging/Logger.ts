export type LogLevel = "error" | "warn" | "info" | "debug" | "trace";

const LEVEL_ORDER: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  trace: 4
};

const REDACT_KEYS = ["password", "token", "secret", "authorization", "cookie"];

function redactValue(value: unknown): string {
  if (typeof value === "string") {
    try {
      const url = new URL(value);
      if (url.search) {
        url.search = "?redacted";
      }
      return url.toString();
    } catch {
      return value;
    }
  }
  if (value && typeof value === "object") {
    return JSON.stringify(value, (key, val) => {
      if (REDACT_KEYS.some((k) => key.toLowerCase().includes(k))) {
        return "[redacted]";
      }
      return val;
    });
  }
  return String(value);
}

export class Logger {
  private level: LogLevel;

  constructor(level: LogLevel = "info") {
    this.level = level;
  }

  setLevel(level: LogLevel) {
    this.level = level;
  }

  error(message: string, ...args: unknown[]) {
    this.log("error", message, ...args);
  }

  warn(message: string, ...args: unknown[]) {
    this.log("warn", message, ...args);
  }

  info(message: string, ...args: unknown[]) {
    this.log("info", message, ...args);
  }

  debug(message: string, ...args: unknown[]) {
    this.log("debug", message, ...args);
  }

  trace(message: string, ...args: unknown[]) {
    this.log("trace", message, ...args);
  }

  log(level: LogLevel, message: string, ...args: unknown[]) {
    if (LEVEL_ORDER[level] > LEVEL_ORDER[this.level]) {
      return;
    }
    const time = new Date().toISOString();
    const suffix = args.length ? " " + args.map(redactValue).join(" ") : "";
    const line = `[${time}] [${level}] ${message}${suffix}`;
    if (level === "error") {
      console.error(line);
    } else if (level === "warn") {
      console.warn(line);
    } else {
      console.log(line);
    }
  }
}
