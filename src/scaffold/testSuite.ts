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
  extraFiles: Array<{ path: string; content: string }>;
};

const DEFAULT_TARGET_URL = "https://example.com";

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
      extraFiles: [],
    };
  }

  if (runner === "mocha") {
    return {
      testFilePath: path.join("test", "cpw.spec.mjs"),
      testFileContent: mochaTemplate(),
      testScript: 'npx mocha "test/**/*.spec.mjs"',
      testWatchScript: 'npx mocha "test/**/*.spec.mjs" --watch',
      extraFiles: [],
    };
  }

  return {
    testFilePath: path.join("test", "cpw.test.mjs"),
    testFileContent: nodeTestTemplate(),
    testScript: "node --test",
    extraFiles: [],
  };
}

function vitestTemplate() {
  return `import { describe, expect, it } from "vitest";
import { chromium } from "@toolstackhq/cdpwright";

describe("login flow", () => {
  it("opens the dashboard link", async () => {
    await chromium.withBrowser({ headless: true }, async (browser) => {
      const page = await browser.newPage();
      await page.goto(${JSON.stringify(DEFAULT_TARGET_URL)}, { waitUntil: "load" });
      await expect(page).element("h1").toHaveText(/Example Domain/);
    });
  });
});
`;
}

function mochaTemplate() {
  return `import assert from "node:assert/strict";
import { chromium } from "@toolstackhq/cdpwright";

describe("login flow", () => {
  it("opens the dashboard link", async () => {
    await chromium.withBrowser({ headless: true }, async (browser) => {
      const page = await browser.newPage();
      await page.goto(${JSON.stringify(DEFAULT_TARGET_URL)}, { waitUntil: "load" });
      const title = await page.evaluate(() => document.title);
      assert.equal(title, "Example Domain");
    });
  });
});
`;
}

function nodeTestTemplate() {
  return `import test from "node:test";
import assert from "node:assert/strict";
import { chromium } from "@toolstackhq/cdpwright";

test("login flow", async () => {
  await chromium.withBrowser({ headless: true }, async (browser) => {
    const page = await browser.newPage();
    await page.goto(${JSON.stringify(DEFAULT_TARGET_URL)}, { waitUntil: "load" });
    const title = await page.evaluate(() => document.title);
    assert.equal(title, "Example Domain");
  });
});
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
