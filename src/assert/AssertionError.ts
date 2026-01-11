export class AssertionError extends Error {
  selector?: string;
  timeoutMs?: number;
  lastState?: unknown;

  constructor(message: string, options: { selector?: string; timeoutMs?: number; lastState?: unknown } = {}) {
    super(message);
    this.name = "AssertionError";
    this.selector = options.selector;
    this.timeoutMs = options.timeoutMs;
    this.lastState = options.lastState;
  }
}
