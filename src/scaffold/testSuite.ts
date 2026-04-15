import fs from "fs";
import path from "path";

export type TestRunner = "vitest" | "mocha" | "node:test" | "node";

export type ScaffoldTestSuiteOptions = {
  cwd?: string;
  runner: TestRunner;
};

export type ScaffoldTestSuiteResult = {
  rootDir: string;
  packageJsonPath: string;
  testFilePath: string;
  extraFiles: string[];
  testScript: string;
  testWatchScript?: string;
};

type RunnerPreset = {
  testFilePath: string;
  testFileContent: string;
  testScript: string;
  testWatchScript?: string;
  devDependencies: Record<string, string>;
  extraFiles: Array<{ path: string; content: string }>;
};

export function normalizeTestRunner(value: string | undefined): TestRunner | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "vitest") return "vitest";
  if (normalized === "mocha") return "mocha";
  if (normalized === "node:test" || normalized === "node" || normalized === "node-test") return "node:test";
  return null;
}

export function scaffoldTestSuite(options: ScaffoldTestSuiteOptions): ScaffoldTestSuiteResult {
  const rootDir = findProjectRoot(options.cwd ?? process.cwd());
  const packageJsonPath = path.join(rootDir, "package.json");
  const pkg = readJson(packageJsonPath) as Record<string, unknown>;
  const preset = buildRunnerPreset(options.runner);

  for (const file of [preset.testFilePath, ...preset.extraFiles.map((file) => file.path)]) {
    const absolute = path.join(rootDir, file);
    if (fs.existsSync(absolute)) {
      throw new Error(`Refusing to overwrite existing file: ${file}`);
    }
  }

  const scripts = isRecord(pkg.scripts) ? { ...pkg.scripts } : {};
  scripts.test = preset.testScript;
  if (preset.testWatchScript) {
    scripts["test:watch"] = preset.testWatchScript;
  }
  pkg.scripts = scripts;
  const devDependencies = isRecord(pkg.devDependencies) ? { ...pkg.devDependencies } : {};
  for (const [name, version] of Object.entries(preset.devDependencies)) {
    devDependencies[name] = version;
  }
  if (Object.keys(devDependencies).length > 0) {
    pkg.devDependencies = devDependencies;
  }

  writeJson(packageJsonPath, pkg);
  writeFile(rootDir, preset.testFilePath, preset.testFileContent);
  for (const extraFile of preset.extraFiles) {
    writeFile(rootDir, extraFile.path, extraFile.content);
  }

  return {
    rootDir,
    packageJsonPath,
    testFilePath: path.join(rootDir, preset.testFilePath),
    extraFiles: preset.extraFiles.map((file) => path.join(rootDir, file.path)),
    testScript: preset.testScript,
    testWatchScript: preset.testWatchScript,
  };
}

function buildRunnerPreset(runner: TestRunner): RunnerPreset {
  if (runner === "vitest") {
    return {
      testFilePath: path.join("tests", "cpw.test.mjs"),
      testFileContent: vitestTemplate(),
      testScript: "npx vitest run",
      testWatchScript: "npx vitest",
      devDependencies: {
        vitest: "^2.1.9",
      },
      extraFiles: [
        {
          path: path.join("tests", "cpw.html"),
          content: fixtureHtml(),
        },
      ],
    };
  }

  if (runner === "mocha") {
    return {
      testFilePath: path.join("test", "cpw.spec.mjs"),
      testFileContent: mochaTemplate(),
      testScript: 'npx mocha "test/**/*.spec.mjs"',
      testWatchScript: 'npx mocha "test/**/*.spec.mjs" --watch',
      devDependencies: {
        mocha: "^11.7.5",
      },
      extraFiles: [
        {
          path: path.join("test", "cpw.html"),
          content: fixtureHtml(),
        },
      ],
    };
  }

  return {
    testFilePath: path.join("test", "cpw.test.mjs"),
    testFileContent: nodeTestTemplate(),
    testScript: "node --test",
    devDependencies: {},
    extraFiles: [
      {
        path: path.join("test", "cpw.html"),
        content: fixtureHtml(),
      },
    ],
  };
}

function vitestTemplate() {
  return `import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, it } from "vitest";
import { chromium, expect as cdpExpect } from "@toolstackhq/cdpwright";

const fixtureUrl = pathToFileURL(path.resolve("tests", "cpw.html")).toString();
const launchOptions = {
  headless: true,
  args: process.platform === "linux" ? ["--no-sandbox", "--no-zygote", "--disable-dev-shm-usage"] : [],
};

describe("login flow", () => {
  it("opens the dashboard link", async () => {
    await chromium.withBrowser(launchOptions, async (browser) => {
      const page = await browser.newPage();
      await page.goto(fixtureUrl, { allowFileUrl: true, waitUntil: "load" });
      await cdpExpect(page).element("h1").toHaveText("Example Domain");
    });
  });
});
`;
}

function mochaTemplate() {
  return `import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "@toolstackhq/cdpwright";

const fixtureUrl = pathToFileURL(path.resolve("test", "cpw.html")).toString();
const launchOptions = {
  headless: true,
  args: process.platform === "linux" ? ["--no-sandbox", "--no-zygote", "--disable-dev-shm-usage"] : [],
};

describe("login flow", () => {
  it("opens the dashboard link", async () => {
    await chromium.withBrowser(launchOptions, async (browser) => {
      const page = await browser.newPage();
      await page.goto(fixtureUrl, { allowFileUrl: true, waitUntil: "load" });
      assert.equal(await page.evaluate(() => document.title), "cpw scaffold");
    });
  });
});
`;
}

function nodeTestTemplate() {
  return `import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "@toolstackhq/cdpwright";

const fixtureUrl = pathToFileURL(path.resolve("test", "cpw.html")).toString();
const launchOptions = {
  headless: true,
  args: process.platform === "linux" ? ["--no-sandbox", "--no-zygote", "--disable-dev-shm-usage"] : [],
};

test("login flow", async () => {
  await chromium.withBrowser(launchOptions, async (browser) => {
    const page = await browser.newPage();
    await page.goto(fixtureUrl, { allowFileUrl: true, waitUntil: "load" });
    const title = await page.evaluate(() => document.title);
    assert.equal(title, "cpw scaffold");
  });
});
`;
}

function fixtureHtml() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>cpw scaffold</title>
  </head>
  <body>
    <h1>Example Domain</h1>
  </body>
</html>
`;
}

function findProjectRoot(startDir: string): string {
  let current = path.resolve(startDir);
  while (true) {
    if (fs.existsSync(path.join(current, "package.json"))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error(`Could not find package.json starting from ${startDir}`);
    }
    current = parent;
  }
}

function readJson(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function writeJson(filePath: string, value: unknown) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeFile(rootDir: string, relativePath: string, content: string) {
  const absolute = path.join(rootDir, relativePath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, content);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
