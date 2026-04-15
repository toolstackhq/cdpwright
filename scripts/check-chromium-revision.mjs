#!/usr/bin/env node

import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const SNAPSHOT_BASE = (process.env.CDPWRIGHT_DOWNLOAD_MIRROR?.trim() || "https://commondatastorage.googleapis.com/chromium-browser-snapshots").replace(/\/+$/, "");
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REVISION_FILE = path.resolve(SCRIPT_DIR, "..", "src/browser/Revision.ts");
const OUTPUT_FILE = process.env.GITHUB_OUTPUT;

const TARGETS = [
  { platform: "linux", folder: "Linux_x64", archive: "chrome-linux.zip" },
  { platform: "mac", folder: "Mac", archive: "chrome-mac.zip" },
  { platform: "win", folder: "Win", archive: "chrome-win.zip" }
];

async function main() {
  const source = await fsPromises.readFile(REVISION_FILE, "utf8");
  const pinnedRevision = parsePinnedRevision(source);
  const latestByTarget = await Promise.all(
    TARGETS.map(async (target) => ({
      ...target,
      revision: await fetchLatestRevision(target.folder)
    }))
  );

  const highestObserved = Math.max(...latestByTarget.map((entry) => entry.revision));
  const sharedUpperBound = Math.min(...latestByTarget.map((entry) => entry.revision));

  let candidateRevision = null;
  if (sharedUpperBound > pinnedRevision) {
    for (let revision = sharedUpperBound; revision > pinnedRevision; revision -= 1) {
      if (await isSharedRevision(revision)) {
        candidateRevision = revision;
        break;
      }
    }
  }

  const shouldNotify = candidateRevision != null;
  const outputs = {
    pinned_revision: String(pinnedRevision),
    latest_linux_revision: String(latestByTarget.find((entry) => entry.platform === "linux")?.revision ?? ""),
    latest_mac_revision: String(latestByTarget.find((entry) => entry.platform === "mac")?.revision ?? ""),
    latest_win_revision: String(latestByTarget.find((entry) => entry.platform === "win")?.revision ?? ""),
    highest_observed_revision: String(highestObserved),
    shared_search_ceiling: String(sharedUpperBound),
    candidate_revision: candidateRevision == null ? "" : String(candidateRevision),
    should_notify: String(shouldNotify)
  };

  for (const [key, value] of Object.entries(outputs)) {
    emitOutput(key, value);
  }

  console.log(
    [
      `Pinned Chromium revision: ${pinnedRevision}`,
      `linux: ${outputs.latest_linux_revision}`,
      `mac: ${outputs.latest_mac_revision}`,
      `win: ${outputs.latest_win_revision}`,
      `Highest observed revision: ${highestObserved}`,
      `Shared search ceiling: ${sharedUpperBound}`,
      candidateRevision == null ? "No shared Chromium revision newer than the current pin is available yet." : `Shared Chromium revision available: ${candidateRevision}`
    ].join("\n")
  );
}

async function isSharedRevision(revision) {
  const availability = await Promise.all(
    TARGETS.map(async (target) => ({
      ...target,
      available: await snapshotExists(target.folder, revision, target.archive)
    }))
  );
  return availability.every((entry) => entry.available);
}

function emitOutput(key, value) {
  if (!OUTPUT_FILE) {
    console.log(`${key}=${value}`);
    return;
  }
  fs.appendFileSync(OUTPUT_FILE, `${key}=${value}\n`);
}

function parsePinnedRevision(source) {
  const match = source.match(/export const PINNED_REVISION = "(\d+)";/);
  if (!match) {
    throw new Error("Could not parse PINNED_REVISION from src/browser/Revision.ts");
  }
  const revision = Number.parseInt(match[1], 10);
  if (!Number.isFinite(revision)) {
    throw new Error(`Invalid pinned revision: ${match[1]}`);
  }
  return revision;
}

async function fetchLatestRevision(folder) {
  const url = `${SNAPSHOT_BASE}/${folder}/LAST_CHANGE`;
  const response = await fetch(url, {
    headers: {
      "user-agent": "cdpwright-revision-watch"
    }
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch latest Chromium revision from ${url}: ${response.status}`);
  }
  const revision = Number.parseInt((await response.text()).trim(), 10);
  if (!Number.isFinite(revision)) {
    throw new Error(`Invalid revision returned by ${url}`);
  }
  return revision;
}

async function snapshotExists(folder, revision, archive) {
  const url = `${SNAPSHOT_BASE}/${folder}/${revision}/${archive}`;
  const response = await fetch(url, {
    method: "HEAD",
    headers: {
      "user-agent": "cdpwright-revision-watch"
    }
  });
  return response.ok;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});
