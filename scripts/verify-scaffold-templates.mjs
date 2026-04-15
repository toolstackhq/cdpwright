import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = path.join(repoRoot, "dist", "cli.js");
const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";

const presets = [
  {
    runner: "vitest",
    testPath: "tests/cpw.test.mjs",
    testScript: "npx vitest run",
    watchScript: "npx vitest"
  },
  {
    runner: "mocha",
    testPath: "test/cpw.spec.mjs",
    testScript: 'npx mocha "test/**/*.spec.mjs"',
    watchScript: 'npx mocha "test/**/*.spec.mjs" --watch'
  },
  {
    runner: "node",
    testPath: "test/cpw.test.mjs",
    testScript: "node --test",
    watchScript: undefined
  }
];

const requestedRunner = process.argv[2];
const runners = requestedRunner ? presets.filter((preset) => preset.runner === requestedRunner) : presets;

if (requestedRunner && runners.length === 0) {
  throw new Error(`Unknown scaffold runner: ${requestedRunner}`);
}

for (const preset of runners) {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), `cdpwright-${preset.runner}-`));
  fs.writeFileSync(
    path.join(projectDir, "package.json"),
    JSON.stringify({ name: `scaffold-${preset.runner}`, version: "1.0.0" }, null, 2) + "\n"
  );

  execFileSync(npmCmd, ["install", "--no-package-lock", "--save-dev", `file:${repoRoot}`], {
    cwd: projectDir,
    stdio: "inherit"
  });

  execFileSync(process.execPath, [cliPath, "init", "test", preset.runner], {
    cwd: projectDir,
    stdio: "inherit"
  });

  execFileSync(npmCmd, ["install", "--no-package-lock"], {
    cwd: projectDir,
    stdio: "inherit"
  });

  execFileSync(npmCmd, ["exec", "--", "cpw", "install"], {
    cwd: projectDir,
    stdio: "inherit",
    env: {
      ...process.env,
      CI: "true",
      CDPWRIGHT_CACHE_DIR: path.join(projectDir, ".cdpwright-cache")
    }
  });

  execFileSync(npmCmd, ["test"], {
    cwd: projectDir,
    stdio: "inherit",
    env: {
      ...process.env,
      CI: "true",
      CDPWRIGHT_CACHE_DIR: path.join(projectDir, ".cdpwright-cache")
    }
  });

  const pkg = JSON.parse(fs.readFileSync(path.join(projectDir, "package.json"), "utf-8"));
  if (pkg.scripts?.test !== preset.testScript) {
    throw new Error(`Unexpected test script for ${preset.runner}: ${pkg.scripts?.test}`);
  }
  if (pkg.scripts?.["test:watch"] !== preset.watchScript) {
    throw new Error(`Unexpected watch script for ${preset.runner}: ${pkg.scripts?.["test:watch"]}`);
  }
  if (!fs.existsSync(path.join(projectDir, preset.testPath))) {
    throw new Error(`Missing scaffold test file for ${preset.runner}: ${preset.testPath}`);
  }
  if (!fs.existsSync(path.join(projectDir, preset.testPath.replace(/cpw\.(spec|test)\.mjs$/, "cpw.html")))) {
    throw new Error(`Missing scaffold fixture file for ${preset.runner}`);
  }
}
