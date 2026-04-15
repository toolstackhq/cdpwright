import fs from "fs";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";
import { ChromiumManager } from "./browser/ChromiumManager.js";
import { automaton } from "./index.js";
import { PINNED_REVISION, resolveRevision } from "./browser/Revision.js";
import { normalizeTestRunner, scaffoldTestSuite } from "./scaffold/testSuite.js";
import { serializeMarkdownFromElement } from "./html/markdown.js";
import {
  detectPlatform,
  defaultCacheRoot,
  chromiumExecutableRelativePath,
  chromiumVersion,
} from "./browser/Downloader.js";
import type { Browser } from "./core/Browser.js";
import type { Page } from "./core/Page.js";

// --- Session file ---

function sessionFilePath(): string {
  const platform = detectPlatform();
  const cacheRoot = defaultCacheRoot(platform);
  return path.join(cacheRoot, "session.json");
}

type SessionInfo = { wsEndpoint: string; pid: number };

function writeSession(info: SessionInfo) {
  const filePath = sessionFilePath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(info));
}

function readSession(): SessionInfo | null {
  const filePath = sessionFilePath();
  if (!fs.existsSync(filePath)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    if (!data.wsEndpoint || !data.pid) return null;
    // Check if the process is still alive
    try {
      process.kill(data.pid, 0);
    } catch {
      clearSession();
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function clearSession() {
  const filePath = sessionFilePath();
  try {
    fs.unlinkSync(filePath);
  } catch {
    // ignore
  }
}

// --- Helpers ---

function printHelp() {
  console.log(`cdpwright (cpw) — Chromium automation CLI

Commands:
  screenshot <url> -o f    Take a screenshot (PNG/JPEG)
  pdf <url> -o file.pdf    Generate visual PDF of page
  html <url> -o file.html  Save the page HTML source
  markdown <url> -o f.md    Convert page content to Markdown
  eval <url> <script>      Run JS in page, print result as JSON
  init test <runner>       Scaffold a test suite (vitest, mocha, node)
  install [options]        Download pinned Chromium snapshot
  download                 Alias for install
  version                  Print cdpwright and Chromium versions

Options:
  --headless               Run in headless mode (default for screenshot, pdf, eval)
  --headed                 Run in headed mode
  -o, --output <file>      Output file path (for screenshot, html, pdf)
  --full-page              Capture full scrollable page (for screenshot)
  --latest                 Download the latest Chromium revision (for install)
  --mirror <url>           Custom mirror base URL (for install)
  --url <url>              Exact zip URL override (for install)

Interactive session:
  open <url>               Open browser and start a session
  close                    Close the running session
  When a session is running, commands accept no URL and operate on the
  live page instead:  cpw screenshot -o shot.png | cpw eval "document.title"`);
}

function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}

function flagValue(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index === -1 || index + 1 >= args.length) return undefined;
  return args[index + 1];
}

const VALUE_FLAGS = ["--mirror", "--url", "-o", "--output"];

function resolveHeadless(args: string[], defaultValue: boolean): boolean {
  if (hasFlag(args, "--headed")) return false;
  if (hasFlag(args, "--headless")) return true;
  return defaultValue;
}

function positionalArgs(args: string[]): string[] {
  const result: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("-")) {
      if (VALUE_FLAGS.includes(args[i])) i++;
      continue;
    }
    result.push(args[i]);
  }
  return result;
}

function launchArgs(): string[] {
  const args: string[] = [];
  if (process.platform === "linux") {
    args.push("--no-sandbox", "--no-zygote", "--disable-dev-shm-usage");
  }
  return args;
}

function pngDimensions(buffer: Buffer): { width: number; height: number } {
  if (buffer.length < 24) {
    throw new Error("Invalid PNG screenshot");
  }
  if (buffer.readUInt32BE(0) !== 0x89504e47 || buffer.readUInt32BE(4) !== 0x0d0a1a0a) {
    throw new Error("Invalid PNG screenshot");
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

/** Connect to running session. Returns browser + the first page. */
async function connectToSession(): Promise<{ browser: Browser; page: Page }> {
  const session = readSession();
  if (!session) {
    console.error("No running session. Start one with: cpw open <url>");
    process.exit(1);
  }
  const browser = await automaton.connect(session.wsEndpoint);
  const targets = await browser.pages();
  if (targets.length === 0) {
    console.error("Session has no open pages.");
    await browser.disconnect();
    process.exit(1);
  }
  const page = await browser.attachPage(targets[0].targetId);
  return { browser, page };
}

/** Launch standalone browser, navigate, run fn, close. */
async function withPage<T>(
  url: string,
  options: { headless?: boolean; maximize?: boolean },
  fn: (page: Page, browser: Browser) => Promise<T>
): Promise<T> {
  const browser = await automaton.launch({
    headless: options.headless ?? true,
    maximize: options.maximize ?? false,
    args: launchArgs(),
    logLevel: "warn",
  });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "load" });
    return await fn(page, browser);
  } finally {
    await browser.close();
  }
}

// --- Commands ---

async function cmdDownload(rest: string[]) {
  const latest = hasFlag(rest, "--latest");
  const mirrorFlag = flagValue(rest, "--mirror");
  if (mirrorFlag) process.env.CDPWRIGHT_DOWNLOAD_MIRROR = mirrorFlag;
  const urlFlag = flagValue(rest, "--url");
  if (urlFlag) process.env.CDPWRIGHT_DOWNLOAD_URL = urlFlag;
  const manager = new ChromiumManager();
  await manager.download({ latest });
}

async function cmdInit(rest: string[]) {
  const subcommand = rest[0];
  if (subcommand !== "test") {
    console.error("Usage: cpw init test <runner>");
    console.error("Supported runners: vitest, mocha, node");
    process.exit(1);
  }

  const runner = normalizeTestRunner(rest[1]);
  if (!runner) {
    console.error("Usage: cpw init test <runner>");
    console.error("Supported runners: vitest, mocha, node");
    process.exit(1);
  }

  const result = scaffoldTestSuite({ runner });
  const extraFileLines = result.extraFiles.map((file) => `- ${path.relative(process.cwd(), file)}`).join("\n");

  console.log(`Scaffolded test suite for ${runner}`);
  console.log(`- updated ${path.relative(process.cwd(), result.packageJsonPath)}`);
  console.log(`- wrote ${path.relative(process.cwd(), result.testFilePath)}`);
  if (result.extraFiles.length > 0) {
    console.log(extraFileLines);
  }
  console.log(`Run: npm test`);
}

async function cmdOpen(rest: string[]) {
  const url = positionalArgs(rest)[0];
  if (!url) {
    console.error("Usage: cpw open <url>");
    process.exit(1);
  }

  const headless = resolveHeadless(rest, false);

  const browser = await automaton.launch({
    headless,
    args: launchArgs(),
    logLevel: "warn",
  });

  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "load" });

  // Save session so other terminals can connect
  writeSession({
    wsEndpoint: browser.wsEndpoint,
    pid: browser.pid || process.pid,
  });

  console.log(`Browser open at ${url}`);
  console.log(`Session saved. Run commands in another terminal:`);
  console.log(`  npx cpw screenshot -o shot.png`);
  console.log(`  npx cpw eval "document.title"`);
  console.log(`  npx cpw close`);
  console.log(`\nPress Ctrl+C to close.`);

  await new Promise<void>((resolve) => {
    process.on("SIGINT", () => {
      console.log("\nClosing browser...");
      resolve();
    });
    process.on("SIGTERM", () => resolve());
  });

  clearSession();
  try {
    await browser.close();
  } catch {
    // browser may have already exited
  }
}

async function cmdClose() {
  const session = readSession();
  if (!session) {
    console.error("No running session.");
    process.exit(1);
  }
  try {
    const browser = await automaton.connect(session.wsEndpoint);
    await browser.close();
  } catch {
    // kill the process directly if CDP fails
    try {
      process.kill(session.pid, "SIGTERM");
    } catch {
      // ignore
    }
  }
  clearSession();
  console.log("Session closed.");
}

async function cmdScreenshot(rest: string[]) {
  const pos = positionalArgs(rest);
  const url = pos[0];
  const output = flagValue(rest, "-o") || flagValue(rest, "--output");
  if (!output) {
    console.error("Usage: cpw screenshot [url] -o <file> [--full-page]");
    process.exit(1);
  }
  const fullPage = hasFlag(rest, "--full-page");
  const format = output.endsWith(".jpeg") || output.endsWith(".jpg") ? "jpeg" as const : "png" as const;

  if (url) {
    // Standalone: launch, screenshot, close
    const headless = resolveHeadless(rest, true);
    await withPage(url, { headless }, async (page) => {
      await page.screenshot({ path: output, format, fullPage });
    });
  } else {
    // Session: connect to running browser
    const { browser, page } = await connectToSession();
    try {
      await page.screenshot({ path: output, format, fullPage });
    } finally {
      await browser.disconnect();
    }
  }

  console.log(`Screenshot saved to ${output}`);
}

async function cmdHtml(rest: string[]) {
  const pos = positionalArgs(rest);
  const url = pos[0];
  const output = flagValue(rest, "-o") || flagValue(rest, "--output");
  if (!output) {
    console.error("Usage: cpw html [url] -o <file>");
    process.exit(1);
  }

  const writeHtml = async (page: Page) => {
    const html = await page.content();
    fs.writeFileSync(path.resolve(output), html, "utf-8");
  };

  if (url) {
    const headless = resolveHeadless(rest, true);
    await withPage(url, { headless }, async (page) => {
      await writeHtml(page);
    });
  } else {
    const { browser, page } = await connectToSession();
    try {
      await writeHtml(page);
    } finally {
      await browser.disconnect();
    }
  }

  console.log(`HTML saved to ${output}`);
}

async function cmdMarkdown(rest: string[]) {
  const pos = positionalArgs(rest);
  const url = pos[0];
  const output = flagValue(rest, "-o") || flagValue(rest, "--output");

  const writeMarkdown = async (page: Page) => {
    const markdown = await page.evaluate<string>((serializerSource) => {
      const serializeMarkdownFromElement = new Function(`return (${serializerSource})`)() as typeof import("./html/markdown.js").serializeMarkdownFromElement;
      const preferredRoot =
        document.querySelector("main, article, [role='main']") ??
        document.body ??
        document.documentElement;
      return serializeMarkdownFromElement(preferredRoot as never, (el) => window.getComputedStyle(el as Element));
    }, serializeMarkdownFromElement.toString());
    if (output) {
      fs.writeFileSync(path.resolve(output), markdown, "utf-8");
    } else {
      process.stdout.write(markdown);
      if (!markdown.endsWith("\n")) {
        process.stdout.write("\n");
      }
    }
  };

  if (url) {
    const headless = resolveHeadless(rest, true);
    await withPage(url, { headless }, async (page) => {
      await writeMarkdown(page);
    });
  } else {
    const { browser, page } = await connectToSession();
    try {
      await writeMarkdown(page);
    } finally {
      await browser.disconnect();
    }
  }

  if (output) {
    console.log(`Markdown saved to ${output}`);
  }
}

async function cmdPdf(rest: string[]) {
  const pos = positionalArgs(rest);
  const url = pos[0];
  const output = flagValue(rest, "-o") || flagValue(rest, "--output");
  if (!output) {
    console.error("Usage: cpw pdf [url] -o <file>");
    process.exit(1);
  }

  const renderVisualPdf = async (browser: Browser, page: Page) => {
    // Print a screenshot-backed helper page so the PDF matches what the user sees on screen.
    const screenshot = await page.screenshotBase64({ format: "png" });
    const screenshotSize = pngDimensions(Buffer.from(screenshot, "base64"));
    const context = await browser.newContext();
    try {
      const helperPage = await context.newPage();
      const imageDataUrl = `data:image/png;base64,${screenshot}`;
      const screenshotDimensions = await helperPage.evaluate<{ width: number; height: number }>((dataUrl) => {
        document.open();
        document.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      html, body {
        margin: 0;
        padding: 0;
        overflow: hidden;
        background: #fff;
      }
      img {
        display: block;
        width: 100%;
        height: auto;
      }
    </style>
  </head>
  <body>
    <img id="shot" alt="page screenshot">
  </body>
</html>`);
        document.close();
        const img = document.getElementById("shot");
        if (!(img instanceof HTMLImageElement)) {
          throw new Error("Failed to create PDF preview image");
        }
        return new Promise<{ width: number; height: number }>((resolve, reject) => {
          img.onload = () => {
            resolve({ width: img.naturalWidth || 0, height: img.naturalHeight || 0 });
          };
          img.onerror = () => reject(new Error("Failed to load screenshot image"));
          img.src = dataUrl;
        });
      }, imageDataUrl);

      await helperPage.pdf({
        path: output,
        printBackground: true,
        paperWidth: Math.max((screenshotDimensions?.width ?? screenshotSize.width) / 96, 1),
        paperHeight: Math.max((screenshotDimensions?.height ?? screenshotSize.height) / 96, 1),
        marginTop: 0,
        marginBottom: 0,
        marginLeft: 0,
        marginRight: 0,
        scale: 1,
        preferCSSPageSize: false,
      });
    } finally {
      await context.close();
    }
  };

  if (url) {
    await withPage(url, { headless: true, maximize: true }, async (page, browser) => {
      await renderVisualPdf(browser, page);
    });
  } else {
    const { browser, page } = await connectToSession();
    try {
      await renderVisualPdf(browser, page);
    } finally {
      await browser.disconnect();
    }
  }

  console.log(`PDF saved to ${output}`);
}

async function cmdEval(rest: string[]) {
  const pos = positionalArgs(rest);

  // If session exists and only one positional arg, treat it as script (no URL)
  const session = readSession();
  let url: string | undefined;
  let script: string;

  if (pos.length >= 2) {
    url = pos[0];
    script = pos[1];
  } else if (pos.length === 1 && session) {
    script = pos[0];
  } else if (pos.length === 1) {
    // No session, treat as error — need URL
    console.error("Usage: cpw eval <url> <script>\n       cpw eval <script>   (when a session is running)");
    process.exit(1);
    return; // unreachable but satisfies TS
  } else {
    console.error("Usage: cpw eval [url] <script>");
    process.exit(1);
    return;
  }

  if (url) {
    const headless = resolveHeadless(rest, true);
    await withPage(url, { headless }, async (page) => {
      const result = await page.evaluate(script);
      const output = result === undefined ? "undefined" : JSON.stringify(result, null, 2);
      console.log(output);
    });
  } else {
    const { browser, page } = await connectToSession();
    try {
      const result = await page.evaluate(script);
      const output = result === undefined ? "undefined" : JSON.stringify(result, null, 2);
      console.log(output);
    } finally {
      await browser.disconnect();
    }
  }
}

async function cmdVersion() {
  const pkgPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../package.json");
  let version = "unknown";
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    version = pkg.version;
  } catch {
    // fallback
  }

  console.log(`cdpwright v${version}`);
  console.log(`Pinned revision: ${PINNED_REVISION}`);

  const platform = detectPlatform();
  const cacheRoot = defaultCacheRoot(platform);
  const revision = resolveRevision(process.env.CDPWRIGHT_REVISION);
  const execPath = path.join(cacheRoot, platform, revision, chromiumExecutableRelativePath(platform));

  if (fs.existsSync(execPath)) {
    try {
      const ver = await chromiumVersion(execPath);
      console.log(`Chromium: ${ver}`);
    } catch {
      console.log(`Chromium: installed at ${execPath}`);
    }
  } else {
    console.log("Chromium: not installed (run 'cpw install')");
  }

  const session = readSession();
  if (session) {
    console.log(`Session: active (pid ${session.pid})`);
  }
}

// --- Main ---

async function main() {
  const [, , command, ...rest] = process.argv;

  if (!command || command === "--help" || command === "-h") {
    printHelp();
    process.exit(0);
  }

  switch (command) {
    case "init":
      return cmdInit(rest);
    case "download":
    case "install":
      return cmdDownload(rest);
    case "open":
      return cmdOpen(rest);
    case "close":
      return cmdClose();
    case "screenshot":
      return cmdScreenshot(rest);
    case "html":
      return cmdHtml(rest);
    case "markdown":
      return cmdMarkdown(rest);
    case "pdf":
      return cmdPdf(rest);
    case "eval":
      return cmdEval(rest);
    case "version":
    case "--version":
    case "-v":
      return cmdVersion();
    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
