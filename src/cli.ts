import { ChromiumManager } from "./browser/ChromiumManager.js";

function printHelp() {
  console.log(`cdpwright (cpw) download [options]

Options:
  --latest              Download the latest Chromium revision
  --mirror <url>        Use a custom mirror base URL (appends /{platform}/{revision}/{zip})
  --url <url>           Download from an exact zip URL (skips path construction)

Environment variables (same effect, CLI flags take precedence):
  CDPWRIGHT_DOWNLOAD_MIRROR   Mirror base URL
  CDPWRIGHT_DOWNLOAD_URL      Exact zip URL`);
}

function flagValue(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index === -1 || index + 1 >= args.length) return undefined;
  return args[index + 1];
}

async function main() {
  const [, , command, ...rest] = process.argv;
  if (!command || command === "--help" || command === "-h") {
    printHelp();
    process.exit(0);
  }

  if (command !== "download") {
    console.error(`Unknown command: ${command}`);
    printHelp();
    process.exit(1);
  }

  const latest = rest.includes("--latest");

  const mirrorFlag = flagValue(rest, "--mirror");
  if (mirrorFlag) process.env.CDPWRIGHT_DOWNLOAD_MIRROR = mirrorFlag;

  const urlFlag = flagValue(rest, "--url");
  if (urlFlag) process.env.CDPWRIGHT_DOWNLOAD_URL = urlFlag;

  const manager = new ChromiumManager();
  await manager.download({ latest });
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
