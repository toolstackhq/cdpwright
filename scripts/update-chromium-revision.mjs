#!/usr/bin/env node

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const SNAPSHOT_BASE = (process.env.CDPWRIGHT_DOWNLOAD_MIRROR?.trim() || "https://commondatastorage.googleapis.com/chromium-browser-snapshots").replace(/\/+$/, "");
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REVISION_FILE = path.resolve(SCRIPT_DIR, "..", "src/browser/Revision.ts");

const TARGETS = [
  { platform: "linux", folder: "Linux_x64", archive: "chrome-linux.zip" },
  { platform: "mac", folder: "Mac", archive: "chrome-mac.zip" },
  { platform: "win", folder: "Win", archive: "chrome-win.zip" }
];

async function main() {
  const source = await fs.readFile(REVISION_FILE, "utf8");
  const pinnedRevision = parsePinnedRevision(source);
  const latestByTarget = await Promise.all(
    TARGETS.map(async (target) => ({
      ...target,
      revision: await fetchLatestRevision(target.folder)
    }))
  );

  const highestObserved = Math.max(...latestByTarget.map((entry) => entry.revision));
  console.log(
    [
      `Pinned Chromium revision: ${pinnedRevision}`,
      ...latestByTarget.map((entry) => `${entry.platform}: ${entry.revision}`),
      `Highest observed revision: ${highestObserved}`
    ].join("\n")
  );

  if (highestObserved <= pinnedRevision) {
    console.log("Pinned revision is already current.");
    return;
  }

  const candidateRevision = await findHighestSharedRevision(pinnedRevision + 1, highestObserved);
  if (candidateRevision == null) {
    console.log("No shared Chromium revision newer than the current pin is available yet.");
    return;
  }

  const updatedSource = source.replace(
    /(export const PINNED_REVISION = )"\d+";/,
    `$1"${candidateRevision}";`
  );
  if (updatedSource === source) {
    throw new Error("Could not locate PINNED_REVISION in src/browser/Revision.ts");
  }

  await fs.writeFile(REVISION_FILE, updatedSource);
  console.log(`Updated pinned Chromium revision to ${candidateRevision}.`);
}

async function findHighestSharedRevision(low, high) {
  let left = low;
  let right = high;
  let best = null;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const shared = await isSharedRevision(mid);
    if (shared) {
      best = mid;
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  return best;
}

async function isSharedRevision(revision) {
  const availability = await Promise.all(
    TARGETS.map(async (target) => ({
      ...target,
      available: await snapshotExists(target.folder, revision, target.archive)
    }))
  );

  const unavailableTargets = availability.filter((entry) => !entry.available);
  if (unavailableTargets.length > 0) {
    console.log(
      `Revision ${revision} is not yet available for all supported platforms, skipping it: ${unavailableTargets
        .map((entry) => entry.platform)
        .join(", ")}`
    );
    return false;
  }

  return true;
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
      "user-agent": "cdpwright-revision-bump"
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
      "user-agent": "cdpwright-revision-bump"
    }
  });
  return response.ok;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});
