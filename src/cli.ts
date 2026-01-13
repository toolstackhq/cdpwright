import { ChromiumManager } from "./browser/ChromiumManager.js";

function printHelp() {
  console.log("chromium-automaton download [--latest]");
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
  const manager = new ChromiumManager();
  await manager.download({ latest });
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
