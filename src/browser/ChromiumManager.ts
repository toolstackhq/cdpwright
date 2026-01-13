import fs from "fs";
import path from "path";
import os from "os";
import http from "http";
import { spawn } from "child_process";
import { Logger, LogLevel } from "../logging/Logger.js";
import { AutomationEvents } from "../core/Events.js";
import { Connection } from "../cdp/Connection.js";
import { Browser } from "../core/Browser.js";
import { detectPlatform, defaultCacheRoot, ensureDownloaded, fetchLatestRevision, Platform, chromiumVersion } from "./Downloader.js";
import { resolveRevision } from "./Revision.js";

export type LaunchOptions = {
  headless?: boolean;
  args?: string[];
  timeoutMs?: number;
  logLevel?: LogLevel;
  logEvents?: boolean;
  logActions?: boolean;
  logAssertions?: boolean;
  executablePath?: string;
  userDataDir?: string;
  maximize?: boolean;
};

export type DownloadOptions = {
  latest?: boolean;
};

export type ResolvedDownload = {
  cacheRoot: string;
  platform: Platform;
  revision: string;
  executablePath: string;
  revisionDir: string;
  chromiumVersion?: string;
};

export class ChromiumManager {
  private logger: Logger;

  constructor(logger?: Logger) {
    const envLevel = (process.env.CHROMIUM_AUTOMATON_LOG_LEVEL as LogLevel | undefined) ?? "info";
    this.logger = logger ?? new Logger(envLevel);
  }

  getLogger() {
    return this.logger;
  }

  async download(options: DownloadOptions = {}): Promise<ResolvedDownload> {
    const platform = detectPlatform();
    const cacheRoot = this.resolveCacheRoot(platform);
    const overrideExecutable = process.env.CHROMIUM_AUTOMATON_EXECUTABLE_PATH;
    let revision = options.latest ? await fetchLatestRevision(platform) : resolveRevision(process.env.CHROMIUM_AUTOMATON_REVISION);
    let executablePath: string;
    let revisionDir = "";
    if (overrideExecutable) {
      executablePath = path.resolve(overrideExecutable);
    } else {
      const downloaded = await ensureDownloaded({
        cacheRoot,
        platform,
        revision,
        logger: this.logger
      });
      executablePath = downloaded.executablePath;
      revisionDir = downloaded.revisionDir;
    }

    if (!fs.existsSync(executablePath)) {
      throw new Error(`Chromium executable not found: ${executablePath}`);
    }

    const version = await chromiumVersion(executablePath);

    this.logger.info("Chromium cache root", cacheRoot);
    this.logger.info("Platform", platform);
    this.logger.info("Revision", revision);
    this.logger.info("Chromium version", version);

    return {
      cacheRoot,
      platform,
      revision,
      executablePath,
      revisionDir,
      chromiumVersion: version
    };
  }

  async launch(options: LaunchOptions = {}) {
    const logger = this.logger;
    if (options.logLevel) {
      logger.setLevel(options.logLevel);
    }

    const executablePath = options.executablePath || process.env.CHROMIUM_AUTOMATON_EXECUTABLE_PATH;
    let resolvedExecutable = executablePath;
    if (!resolvedExecutable) {
      const platform = detectPlatform();
      const cacheRoot = this.resolveCacheRoot(platform);
      const revision = resolveRevision(process.env.CHROMIUM_AUTOMATON_REVISION);
      const downloaded = await ensureDownloaded({
        cacheRoot,
        platform,
        revision,
        logger
      });
      resolvedExecutable = downloaded.executablePath;
    }

    if (!resolvedExecutable || !fs.existsSync(resolvedExecutable)) {
      throw new Error(`Chromium executable not found: ${resolvedExecutable}`);
    }
    const stats = fs.statSync(resolvedExecutable);
    if (!stats.isFile()) {
      throw new Error(`Chromium executable is not a file: ${resolvedExecutable}`);
    }
    ensureExecutable(resolvedExecutable);

    const cleanupTasks: Array<() => void> = [];
    let userDataDir = options.userDataDir ?? process.env.CHROMIUM_AUTOMATON_USER_DATA_DIR;
    if (!userDataDir) {
      userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "chromium-automaton-"));
      cleanupTasks.push(() => fs.rmSync(userDataDir as string, { recursive: true, force: true }));
    }

    const args = [
      "--remote-debugging-port=0",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-background-networking",
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding"
    ];
    if (userDataDir) {
      args.push(`--user-data-dir=${userDataDir}`);
    }
    if (process.platform === "linux") {
      args.push("--disable-crash-reporter", "--disable-crashpad");
    }
    if (options.headless ?? true) {
      args.push("--headless=new");
    }
    if (options.maximize) {
      args.push("--start-maximized");
    }
    if (options.args) {
      args.push(...options.args);
    }

    logger.info("Launching Chromium", resolvedExecutable);
    const child = spawn(resolvedExecutable, args, { stdio: ["ignore", "pipe", "pipe"] });

    const websocketUrl = await waitForWebSocketEndpoint(child, logger, options.timeoutMs ?? 30_000);
    const httpUrl = toHttpVersionUrl(websocketUrl);
    const wsEndpoint = await fetchWebSocketDebuggerUrl(httpUrl);

    const connection = new Connection(wsEndpoint, logger);
    await closeInitialPages(connection, logger);
    const events = new AutomationEvents();
    const logEvents = resolveLogFlag(options.logEvents, process.env.CHROMIUM_AUTOMATON_LOG, true);
    const logActions = resolveLogFlag(options.logActions, process.env.CHROMIUM_AUTOMATON_LOG_ACTIONS, true);
    const logAssertions = resolveLogFlag(options.logAssertions, process.env.CHROMIUM_AUTOMATON_LOG_ASSERTIONS, true);
    if (logEvents && logActions) {
      events.on("action:end", (payload) => {
        const selector = payload.sensitive ? undefined : payload.selector;
        const args = buildLogArgs(selector, payload.durationMs);
        logger.info(`Action ${payload.name}`, ...args);
      });
    }
    if (logEvents && logAssertions) {
      events.on("assertion:end", (payload) => {
        const args = buildLogArgs(payload.selector, payload.durationMs);
        logger.info(`Assertion ${payload.name}`, ...args);
      });
    }
    const browser = new Browser(connection, child, logger, events, cleanupTasks);

    return browser;
  }

  private resolveCacheRoot(platform: Platform) {
    const envRoot = process.env.CHROMIUM_AUTOMATON_CACHE_DIR;
    if (envRoot && envRoot.trim()) {
      return path.resolve(envRoot.trim());
    }
    return defaultCacheRoot(platform);
  }
}

async function closeInitialPages(connection: Connection, logger: Logger) {
  try {
    const targets = await connection.send<{ targetInfos: Array<{ targetId: string; type: string }> }>("Target.getTargets");
    for (const info of targets.targetInfos) {
      if (info.type === "page") {
        await connection.send("Target.closeTarget", { targetId: info.targetId });
      }
    }
  } catch (err) {
    logger.warn("Failed to close initial pages", err);
  }
}

function resolveLogFlag(explicit: boolean | undefined, envValue: string | undefined, defaultValue: boolean) {
  if (explicit !== undefined) {
    return explicit;
  }
  if (envValue == null) {
    return defaultValue;
  }
  const normalized = envValue.trim().toLowerCase();
  return !["0", "false", "no", "off"].includes(normalized);
}

function buildLogArgs(selector?: string, durationMs?: number) {
  const args: string[] = [];
  if (selector) {
    args.push(selector);
  }
  if (typeof durationMs === "number") {
    args.push(`${durationMs}ms`);
  }
  return args;
}

function ensureExecutable(executablePath: string) {
  if (process.platform === "win32") {
    return;
  }
  try {
    const stat = fs.statSync(executablePath);
    const isExecutable = (stat.mode & 0o111) !== 0;
    if (!isExecutable) {
      fs.chmodSync(executablePath, 0o755);
    }
  } catch {
    // ignore chmod errors
  }

  const dir = path.dirname(executablePath);
  const helpers = [
    "chrome_crashpad_handler",
    "chrome_sandbox",
    "chrome-wrapper",
    "xdg-mime",
    "xdg-settings"
  ];
  for (const name of helpers) {
    const helperPath = path.join(dir, name);
    if (!fs.existsSync(helperPath)) {
      continue;
    }
    try {
      const stat = fs.statSync(helperPath);
      const isExecutable = (stat.mode & 0o111) !== 0;
      if (!isExecutable) {
        fs.chmodSync(helperPath, 0o755);
      }
    } catch {
      // ignore chmod errors
    }
  }
}

function waitForWebSocketEndpoint(child: ReturnType<typeof spawn>, logger: Logger, timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const timeout = setTimeout(() => {
      reject(new Error("Timed out waiting for DevTools endpoint"));
    }, timeoutMs);

    const outputLines: string[] = [];
    const pushOutput = (data: Buffer) => {
      const text = data.toString();
      for (const line of text.split(/\r?\n/)) {
        if (!line.trim()) continue;
        outputLines.push(line);
        if (outputLines.length > 50) {
          outputLines.shift();
        }
      }
    };

    const onData = (data: Buffer) => {
      const text = data.toString();
      const match = text.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) {
        clearTimeout(timeout);
        cleanup();
        logger.info("DevTools endpoint", match[1]);
        resolve(match[1]);
      }
      pushOutput(data);
    };

    const onExit = (code: number | null, signal: NodeJS.Signals | null) => {
      cleanup();
      const tail = outputLines.length ? `\nChromium output:\n${outputLines.join("\n")}` : "";
      reject(new Error(`Chromium exited early with code ${code ?? "null"} signal ${signal ?? "null"}${tail}`));
    };

    const cleanup = () => {
      child.stdout?.off("data", onData);
      child.stderr?.off("data", onData);
      child.off("exit", onExit);
    };

    child.stdout?.on("data", onData);
    child.stderr?.on("data", onData);
    child.on("exit", onExit);

    if (Date.now() - start > timeoutMs) {
      cleanup();
    }
  });
}

function toHttpVersionUrl(wsUrl: string) {
  try {
    const url = new URL(wsUrl);
    const port = url.port || "9222";
    return `http://127.0.0.1:${port}/json/version`;
  } catch {
    throw new Error(`Invalid DevTools endpoint: ${wsUrl}`);
  }
}

function fetchWebSocketDebuggerUrl(versionUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    http.get(versionUrl, (res) => {
      if (res.statusCode && res.statusCode >= 400) {
        reject(new Error(`Failed to fetch /json/version: ${res.statusCode}`));
        return;
      }
      let data = "";
      res.on("data", (chunk) => (data += chunk.toString()));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (!parsed.webSocketDebuggerUrl) {
            reject(new Error("webSocketDebuggerUrl missing"));
            return;
          }
          resolve(parsed.webSocketDebuggerUrl);
        } catch (err) {
          reject(err);
        }
      });
    }).on("error", reject);
  });
}
