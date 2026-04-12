import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ChromiumManager } from "./browser/ChromiumManager.js";
import { automaton } from "./index.js";
import { PINNED_REVISION, resolveRevision } from "./browser/Revision.js";
import {
  detectPlatform,
  defaultCacheRoot,
  chromiumExecutableRelativePath,
  chromiumVersion,
} from "./browser/Downloader.js";
import type { Browser } from "./core/Browser.js";
import type { Page } from "./core/Page.js";

function printHelp() {
  console.log(`cdpwright (cpw) — Chromium automation CLI

Commands:
  download [options]       Download pinned Chromium snapshot
  install                  Alias for download
  open <url>               Launch headed browser and navigate to URL
  screenshot <url> -o f    Take a screenshot (PNG/JPEG)
  pdf <url> -o file.pdf    Generate PDF of page (headless only)
  eval <url> <script>      Run script in page, print result as JSON
  version                  Print cdpwright and Chromium versions

Download options:
  --latest                 Download the latest Chromium revision
  --mirror <url>           Custom mirror base URL
  --url <url>              Exact zip URL override

Screenshot options:
  -o, --output <file>      Output file path (required)
  --full-page              Capture full scrollable page

PDF options:
  -o, --output <file>      Output file path (required)`);
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

async function withPage<T>(
  url: string,
  options: { headless?: boolean },
  fn: (page: Page, browser: Browser) => Promise<T>
): Promise<T> {
  const args: string[] = [];
  if (process.platform === "linux") {
    args.push("--no-sandbox", "--no-zygote", "--disable-dev-shm-usage");
  }
  const browser = await automaton.launch({
    headless: options.headless ?? true,
    args,
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

async function cmdOpen(rest: string[]) {
  const url = positionalArgs(rest)[0];
  if (!url) {
    console.error("Usage: cpw open <url>");
    process.exit(1);
  }

  const args: string[] = [];
  if (process.platform === "linux") {
    args.push("--no-sandbox", "--no-zygote", "--disable-dev-shm-usage");
  }

  const browser = await automaton.launch({
    headless: false,
    args,
    logLevel: "warn",
  });

  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "load" });

  console.log(`Browser open at ${url}`);
  console.log("Press Ctrl+C to close.");

  await new Promise<void>((resolve) => {
    process.on("SIGINT", () => {
      console.log("\nClosing browser...");
      resolve();
    });
    process.on("SIGTERM", () => resolve());
  });

  try {
    await browser.close();
  } catch {
    // browser may have already exited
  }
}

async function cmdScreenshot(rest: string[]) {
  const url = positionalArgs(rest)[0];
  const output = flagValue(rest, "-o") || flagValue(rest, "--output");
  if (!url || !output) {
    console.error("Usage: cpw screenshot <url> -o <file> [--full-page]");
    process.exit(1);
  }
  const fullPage = hasFlag(rest, "--full-page");
  const format = output.endsWith(".jpeg") || output.endsWith(".jpg") ? "jpeg" as const : "png" as const;

  await withPage(url, {}, async (page) => {
    await page.screenshot({ path: output, format, fullPage });
  });

  console.log(`Screenshot saved to ${output}`);
}

async function cmdPdf(rest: string[]) {
  const url = positionalArgs(rest)[0];
  const output = flagValue(rest, "-o") || flagValue(rest, "--output");
  if (!url || !output) {
    console.error("Usage: cpw pdf <url> -o <file>");
    process.exit(1);
  }

  await withPage(url, { headless: true }, async (page) => {
    await page.pdf({ path: output, printBackground: true });
  });

  console.log(`PDF saved to ${output}`);
}

async function cmdEval(rest: string[]) {
  const pos = positionalArgs(rest);
  const url = pos[0];
  const script = pos[1];
  if (!url || !script) {
    console.error("Usage: cpw eval <url> <script>");
    process.exit(1);
  }

  await withPage(url, {}, async (page) => {
    const result = await page.evaluate(script);
    const output = result === undefined ? "undefined" : JSON.stringify(result, null, 2);
    console.log(output);
  });
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
}

// --- Main ---

async function main() {
  const [, , command, ...rest] = process.argv;

  if (!command || command === "--help" || command === "-h") {
    printHelp();
    process.exit(0);
  }

  switch (command) {
    case "download":
    case "install":
      return cmdDownload(rest);
    case "open":
      return cmdOpen(rest);
    case "screenshot":
      return cmdScreenshot(rest);
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
