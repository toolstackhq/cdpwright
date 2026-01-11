import fs from "fs";
import path from "path";
import os from "os";
import https from "https";
import { spawn } from "child_process";
import yauzl from "yauzl";
import { Logger } from "../logging/Logger.js";

export type Platform = "linux" | "mac" | "win";

const SNAPSHOT_BASE = "https://commondatastorage.googleapis.com/chromium-browser-snapshots";

export function detectPlatform(platform = process.platform): Platform {
  if (platform === "linux") return "linux";
  if (platform === "darwin") return "mac";
  if (platform === "win32") return "win";
  throw new Error(`Unsupported platform: ${platform}`);
}

export function platformFolder(platform: Platform) {
  if (platform === "linux") return "Linux_x64";
  if (platform === "mac") return "Mac";
  return "Win";
}

export function defaultCacheRoot(platform: Platform) {
  if (platform === "win") {
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
    return path.join(localAppData, "chromium-automaton");
  }
  return path.join(os.homedir(), ".cache", "chromium-automaton");
}

export function ensureWithinRoot(root: string, target: string) {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(target);
  if (resolvedTarget === resolvedRoot) {
    return;
  }
  if (!resolvedTarget.startsWith(resolvedRoot + path.sep)) {
    throw new Error(`Path escapes cache root: ${resolvedTarget}`);
  }
}

export function chromiumExecutableRelativePath(platform: Platform) {
  if (platform === "linux") return path.join("chrome-linux", "chrome");
  if (platform === "mac") return path.join("chrome-mac", "Chromium.app", "Contents", "MacOS", "Chromium");
  return path.join("chrome-win", "chrome.exe");
}

export async function fetchLatestRevision(platform: Platform): Promise<string> {
  const folder = platformFolder(platform);
  const url = `${SNAPSHOT_BASE}/${folder}/LAST_CHANGE`;
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode && res.statusCode >= 400) {
        reject(new Error(`Failed to fetch LAST_CHANGE: ${res.statusCode}`));
        return;
      }
      let data = "";
      res.on("data", (chunk) => (data += chunk.toString()));
      res.on("end", () => resolve(data.trim()));
    }).on("error", reject);
  });
}

export type DownloadOptions = {
  cacheRoot: string;
  platform: Platform;
  revision: string;
  logger: Logger;
};

export async function ensureDownloaded(options: DownloadOptions) {
  const { cacheRoot, platform, revision, logger } = options;
  ensureWithinRoot(cacheRoot, cacheRoot);
  const platformDir = path.join(cacheRoot, platform);
  const revisionDir = path.join(platformDir, revision);
  ensureWithinRoot(cacheRoot, revisionDir);

  const executablePath = path.join(revisionDir, chromiumExecutableRelativePath(platform));
  const markerFile = path.join(revisionDir, "INSTALLATION_COMPLETE");

  if (fs.existsSync(executablePath) && fs.existsSync(markerFile)) {
    return { executablePath, revisionDir };
  }

  fs.mkdirSync(revisionDir, { recursive: true });

  const folder = platformFolder(platform);
  const zipName = platform === "win" ? "chrome-win.zip" : platform === "mac" ? "chrome-mac.zip" : "chrome-linux.zip";
  const downloadUrl = `${SNAPSHOT_BASE}/${folder}/${revision}/${zipName}`;

  const tempZipPath = path.join(os.tmpdir(), `chromium-automaton-${platform}-${revision}.zip`);

  logger.info("Downloading Chromium snapshot", downloadUrl);
  await downloadFile(downloadUrl, tempZipPath, logger);
  logger.info("Extracting Chromium snapshot", tempZipPath);
  await extractZipSafe(tempZipPath, revisionDir);
  fs.writeFileSync(markerFile, new Date().toISOString());
  fs.unlinkSync(tempZipPath);

  if (!fs.existsSync(executablePath)) {
    throw new Error(`Executable not found after extraction: ${executablePath}`);
  }
  ensureExecutable(executablePath, platform);

  return { executablePath, revisionDir };
}

function downloadFile(url: string, dest: string, logger: Logger): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode && res.statusCode >= 400) {
        reject(new Error(`Failed to download: ${res.statusCode}`));
        return;
      }
      const total = Number(res.headers["content-length"] || 0);
      let downloaded = 0;
      let lastLoggedPercent = -1;
      let lastLoggedTime = Date.now();
      res.pipe(file);
      res.on("data", (chunk) => {
        downloaded += chunk.length;
        if (!total) {
          const now = Date.now();
          if (now - lastLoggedTime > 2000) {
            logger.info("Download progress", `${(downloaded / (1024 * 1024)).toFixed(1)} MB`);
            lastLoggedTime = now;
          }
          return;
        }
        const percent = Math.floor((downloaded / total) * 100);
        if (percent >= lastLoggedPercent + 5) {
          logger.info("Download progress", `${percent}%`);
          lastLoggedPercent = percent;
        }
      });
      file.on("finish", () => file.close(() => resolve()));
    }).on("error", (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

export async function extractZipSafe(zipPath: string, destDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
      if (err || !zipfile) {
        reject(err || new Error("Unable to open zip"));
        return;
      }

      zipfile.readEntry();
      zipfile.on("entry", (entry) => {
        const entryPath = entry.fileName.replace(/\\/g, "/");
        const targetPath = path.join(destDir, entryPath);
        try {
          ensureWithinRoot(destDir, targetPath);
        } catch (error) {
          zipfile.close();
          reject(error);
          return;
        }

        if (/\/$/.test(entry.fileName)) {
          fs.mkdirSync(targetPath, { recursive: true });
          zipfile.readEntry();
          return;
        }

        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
        zipfile.openReadStream(entry, (streamErr, readStream) => {
          if (streamErr || !readStream) {
            zipfile.close();
            reject(streamErr || new Error("Unable to read zip entry"));
            return;
          }
          const rawMode = entry.externalFileAttributes ? (entry.externalFileAttributes >>> 16) & 0xffff : 0;
          const mode = rawMode > 0 ? rawMode : undefined;
          const writeStream = fs.createWriteStream(targetPath);
          readStream.pipe(writeStream);
          writeStream.on("error", (writeErr) => {
            zipfile.close();
            reject(writeErr);
          });
          writeStream.on("close", () => {
            if (mode && mode <= 0o777) {
              try {
                fs.chmodSync(targetPath, mode);
              } catch {
                // ignore chmod errors
              }
            }
            zipfile.readEntry();
          });
        });
      });

      zipfile.on("end", () => {
        zipfile.close();
        resolve();
      });

      zipfile.on("error", (zipErr) => {
        zipfile.close();
        reject(zipErr);
      });
    });
  });
}

export async function chromiumVersion(executablePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(executablePath, ["--version"], { stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    child.stdout.on("data", (chunk) => (output += chunk.toString()));
    child.on("close", (code) => {
      if (code === 0) {
        resolve(output.trim());
      } else {
        reject(new Error(`Failed to get Chromium version: ${code}`));
      }
    });
    child.on("error", reject);
  });
}

function ensureExecutable(executablePath: string, platform: Platform) {
  if (platform === "win") {
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
}
