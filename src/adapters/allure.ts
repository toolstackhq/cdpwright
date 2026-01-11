import { Browser } from "../core/Browser.js";

export type AllureLike = {
  startStep(name: string): void;
  endStep(status?: "passed" | "failed"): void;
};

export function attachAllure(browser: Browser, allure: AllureLike) {
  browser.on("action:start", (event) => {
    const label = event.selector ? `${event.name} ${event.selector}` : event.name;
    allure.startStep(label);
  });

  browser.on("action:end", () => {
    allure.endStep("passed");
  });

  browser.on("assertion:start", (event) => {
    const label = event.selector ? `${event.name} ${event.selector}` : event.name;
    allure.startStep(label);
  });

  browser.on("assertion:end", () => {
    allure.endStep("passed");
  });
}
