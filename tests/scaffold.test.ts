import fs from "fs";
import os from "os";
import path from "path";
import { describe, expect, it } from "vitest";
import { normalizeTestRunner, scaffoldTestSuite } from "../src/scaffold/testSuite.js";

function createTempProject() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cdpwright-scaffold-"));
  fs.writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify({
      name: "example-app",
      version: "1.0.0"
    }, null, 2)
  );
  return root;
}

describe("test suite scaffold", () => {
  it("normalizes runner aliases", () => {
    expect(normalizeTestRunner("vitest")).toBe("vitest");
    expect(normalizeTestRunner("mocha")).toBe("mocha");
    expect(normalizeTestRunner("node")).toBe("node:test");
    expect(normalizeTestRunner("node:test")).toBe("node:test");
    expect(normalizeTestRunner("node-test")).toBe("node:test");
    expect(normalizeTestRunner("unknown")).toBe(null);
  });

  it("writes a vitest scaffold and scripts", () => {
    const root = createTempProject();
    const result = scaffoldTestSuite({ cwd: root, runner: "vitest" });
    const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf-8"));
    const content = fs.readFileSync(path.join(root, "tests", "cpw.test.mjs"), "utf-8");

    expect(result.testFilePath).toBe(path.join(root, "tests", "cpw.test.mjs"));
    expect(fs.existsSync(path.join(root, "tests", "cpw.test.mjs"))).toBe(true);
    expect(fs.existsSync(path.join(root, "tests", "cpw.html"))).toBe(true);
    expect(pkg.scripts.test).toBe("npx vitest run");
    expect(pkg.scripts["test:watch"]).toBe("npx vitest");
    expect(pkg.devDependencies.vitest).toBe("^2.1.9");
    expect(content).toContain('--no-sandbox", "--no-zygote", "--disable-dev-shm-usage');
  });

  it("writes a mocha scaffold and scripts", () => {
    const root = createTempProject();
    const result = scaffoldTestSuite({ cwd: root, runner: "mocha" });
    const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf-8"));
    const content = fs.readFileSync(path.join(root, "test", "cpw.spec.mjs"), "utf-8");

    expect(result.testFilePath).toBe(path.join(root, "test", "cpw.spec.mjs"));
    expect(fs.existsSync(path.join(root, "test", "cpw.spec.mjs"))).toBe(true);
    expect(fs.existsSync(path.join(root, "test", "cpw.html"))).toBe(true);
    expect(pkg.scripts.test).toBe('npx mocha "test/**/*.spec.mjs"');
    expect(pkg.scripts["test:watch"]).toBe('npx mocha "test/**/*.spec.mjs" --watch');
    expect(pkg.devDependencies.mocha).toBe("^11.7.5");
    expect(content).toContain('--no-sandbox", "--no-zygote", "--disable-dev-shm-usage');
  });

  it("writes a node:test scaffold and scripts", () => {
    const root = createTempProject();
    const result = scaffoldTestSuite({ cwd: root, runner: "node:test" });
    const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf-8"));
    const content = fs.readFileSync(path.join(root, "test", "cpw.test.mjs"), "utf-8");

    expect(result.testFilePath).toBe(path.join(root, "test", "cpw.test.mjs"));
    expect(fs.existsSync(path.join(root, "test", "cpw.test.mjs"))).toBe(true);
    expect(fs.existsSync(path.join(root, "test", "cpw.html"))).toBe(true);
    expect(pkg.scripts.test).toBe("node --test");
    expect(pkg.scripts["test:watch"]).toBeUndefined();
    expect(pkg.devDependencies).toBeUndefined();
    expect(content).toContain('--no-sandbox", "--no-zygote", "--disable-dev-shm-usage');
  });
});
