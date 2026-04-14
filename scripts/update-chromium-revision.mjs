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
  const sharedUpperBound = Math.min(...latestByTarget.map((entry) => entry.revision));
  console.log(
    [
      `Pinned Chromium revision: ${pinnedRevision}`,
      ...latestByTarget.map((entry) => `${entry.platform}: ${entry.revision}`),
      `Highest observed revision: ${highestObserved}`,
      `Shared search ceiling: ${sharedUpperBound}`
    ].join("\n")
  );

  if (sharedUpperBound <= pinnedRevision) {
    console.log("Pinned revision is already current.");
    return;
  }

  for (let candidateRevision = sharedUpperBound; candidateRevision > pinnedRevision; candidateRevision -= 1) {
    const availability = await Promise.all(
      TARGETS.map(async (target) => ({
        ...target,
        available: await snapshotExists(target.folder, candidateRevision, target.archive)
      }))
    );

    const unavailableTargets = availability.filter((entry) => !entry.available);
    if (unavailableTargets.length > 0) {
      console.log(
        `Revision ${candidateRevision} is not yet available for all supported platforms, skipping it: ${unavailableTargets
          .map((entry) => entry.platform)
          .join(", ")}`
      );
      continue;
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
    return;
  }

  console.log("No shared Chromium revision newer than the current pin is available yet.");
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
