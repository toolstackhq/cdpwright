export type WaitForOptions = {
  timeoutMs?: number;
  intervalMs?: number;
  description?: string;
};

export async function waitFor<T>(predicate: () => Promise<T> | T, options: WaitForOptions = {}): Promise<NonNullable<T>> {
  const timeoutMs = options.timeoutMs ?? 30_000;
  const intervalMs = options.intervalMs ?? 100;
  const start = Date.now();

  let lastError: unknown;
  while (Date.now() - start < timeoutMs) {
    try {
      const result = await predicate();
      if (result) {
        return result as NonNullable<T>;
      }
    } catch (err) {
      lastError = err;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  const description = options.description ? ` (${options.description})` : "";
  const error = new Error(`Timeout after ${timeoutMs}ms${description}`);
  (error as Error & { cause?: unknown }).cause = lastError;
  throw error;
}
