import fs from "fs";
import path from "path";
import { Session } from "../cdp/Session.js";
import { Logger } from "../logging/Logger.js";
import { AutomationEvents } from "./Events.js";
import { Frame } from "./Frame.js";
import { Locator } from "./Locator.js";
import { ensureAllowedUrl } from "./UrlGuard.js";

export type GotoOptions = {
  waitUntil?: "domcontentloaded" | "load";
  timeoutMs?: number;
  allowFileUrl?: boolean;
};

export type ScreenshotOptions = {
  path?: string;
  format?: "png" | "jpeg";
  quality?: number;
};

export class Page {
  private session: Session;
  private logger: Logger;
  private events: AutomationEvents;
  private framesById = new Map<string, Frame>();
  private mainFrameId?: string;
  private lifecycleEvents = new Map<string, Set<string>>();
  private defaultTimeout = 30_000;

  constructor(session: Session, logger: Logger, events: AutomationEvents) {
    this.session = session;
    this.logger = logger;
    this.events = events;
  }

  async initialize() {
    await this.session.send("Page.enable");
    await this.session.send("DOM.enable");
    await this.session.send("Runtime.enable");
    await this.session.send("Network.enable");
    await this.session.send("Page.setLifecycleEventsEnabled", { enabled: true });

    this.session.on("Page.frameAttached", (params) => this.onFrameAttached(params as any));
    this.session.on("Page.frameNavigated", (params) => this.onFrameNavigated(params as any));
    this.session.on("Page.frameDetached", (params) => this.onFrameDetached(params as any));
    this.session.on("Runtime.executionContextCreated", (params) => this.onExecutionContextCreated(params as any));
    this.session.on("Runtime.executionContextDestroyed", (params) => this.onExecutionContextDestroyed(params as any));
    this.session.on("Runtime.executionContextsCleared", () => this.onExecutionContextsCleared());
    this.session.on("Page.lifecycleEvent", (params) => this.onLifecycleEvent(params as any));

    const tree = await this.session.send<{ frameTree: { frame: { id: string; name?: string; url?: string; parentId?: string }; childFrames?: any[] } }>("Page.getFrameTree");
    this.buildFrameTree(tree.frameTree);
  }

  frames() {
    return Array.from(this.framesById.values());
  }

  mainFrame() {
    if (!this.mainFrameId) {
      throw new Error("Main frame not initialized");
    }
    const frame = this.framesById.get(this.mainFrameId);
    if (!frame) {
      throw new Error("Main frame missing");
    }
    return frame;
  }

  frame(options: { name?: string; urlIncludes?: string; predicate?: (frame: Frame) => boolean }) {
    for (const frame of this.framesById.values()) {
      if (options.name && frame.name !== options.name) continue;
      if (options.urlIncludes && !frame.url?.includes(options.urlIncludes)) continue;
      if (options.predicate && !options.predicate(frame)) continue;
      return frame;
    }
    return null;
  }

  locator(selector: string) {
    return new Locator(this.mainFrame(), selector);
  }

  async goto(url: string, options: GotoOptions = {}) {
    ensureAllowedUrl(url, { allowFileUrl: options.allowFileUrl });
    const waitUntil = options.waitUntil ?? "load";
    const lifecycleName = waitUntil === "domcontentloaded" ? "DOMContentLoaded" : "load";
    const timeoutMs = options.timeoutMs ?? this.defaultTimeout;

    this.events.emit("action:start", { name: "goto", selector: url, frameId: this.mainFrameId });
    const start = Date.now();
    await this.session.send("Page.navigate", { url });
    await this.waitForLifecycle(this.mainFrameId, lifecycleName, timeoutMs);
    const duration = Date.now() - start;
    this.events.emit("action:end", { name: "goto", selector: url, frameId: this.mainFrameId, durationMs: duration });
    this.logger.debug("Goto", url, `${duration}ms`);
  }

  async query(selector: string) {
    return this.mainFrame().query(selector);
  }

  async queryAll(selector: string) {
    return this.mainFrame().queryAll(selector);
  }

  async queryXPath(selector: string) {
    return this.mainFrame().queryXPath(selector);
  }

  async queryAllXPath(selector: string) {
    return this.mainFrame().queryAllXPath(selector);
  }

  async click(selector: string, options?: { timeoutMs?: number }) {
    return this.mainFrame().click(selector, options);
  }

  async dblclick(selector: string, options?: { timeoutMs?: number }) {
    return this.mainFrame().dblclick(selector, options);
  }

  async type(selector: string, text: string, options?: { timeoutMs?: number }) {
    return this.mainFrame().type(selector, text, options);
  }

  async typeSecure(selector: string, text: string, options?: { timeoutMs?: number }) {
    return this.mainFrame().typeSecure(selector, text, options);
  }

  async evaluate<T = unknown>(fnOrString: string | ((...args: any[]) => any), ...args: any[]): Promise<T> {
    return this.mainFrame().evaluate(fnOrString, ...args);
  }

  async textSecure(selector: string) {
    return this.mainFrame().textSecure(selector);
  }

  async valueSecure(selector: string) {
    return this.mainFrame().valueSecure(selector);
  }

  async selectOption(selector: string, value: string) {
    return this.mainFrame().selectOption(selector, value);
  }

  async setFileInput(selector: string, name: string, contents: string, options: { mimeType?: string } = {}) {
    return this.mainFrame().setFileInput(selector, name, contents, options);
  }

  async screenshot(options: ScreenshotOptions = {}) {
    const start = Date.now();
    this.events.emit("action:start", { name: "screenshot", frameId: this.mainFrameId });
    const result = await this.session.send<{ data: string }>("Page.captureScreenshot", {
      format: options.format ?? "png",
      quality: options.quality,
      fromSurface: true
    });
    const buffer = Buffer.from(result.data, "base64");
    if (options.path) {
      const resolved = path.resolve(options.path);
      fs.writeFileSync(resolved, buffer);
    }
    const duration = Date.now() - start;
    this.events.emit("action:end", { name: "screenshot", frameId: this.mainFrameId, durationMs: duration });
    return buffer;
  }

  async screenshotBase64(options: Omit<ScreenshotOptions, "path"> = {}) {
    const start = Date.now();
    this.events.emit("action:start", { name: "screenshotBase64", frameId: this.mainFrameId });
    const result = await this.session.send<{ data: string }>("Page.captureScreenshot", {
      format: options.format ?? "png",
      quality: options.quality,
      fromSurface: true
    });
    const duration = Date.now() - start;
    this.events.emit("action:end", { name: "screenshotBase64", frameId: this.mainFrameId, durationMs: duration });
    return result.data;
  }

  getEvents() {
    return this.events;
  }

  getDefaultTimeout() {
    return this.defaultTimeout;
  }

  private buildFrameTree(tree: { frame: { id: string; name?: string; url?: string; parentId?: string }; childFrames?: any[] }) {
    const frame = this.ensureFrame(tree.frame.id);
    frame.setMeta({ name: tree.frame.name, url: tree.frame.url, parentId: tree.frame.parentId });
    if (!tree.frame.parentId) {
      this.mainFrameId = tree.frame.id;
    }
    if (tree.childFrames) {
      for (const child of tree.childFrames) {
        this.buildFrameTree(child);
      }
    }
  }

  private ensureFrame(id: string) {
    let frame = this.framesById.get(id);
    if (!frame) {
      frame = new Frame(id, this.session, this.logger, this.events);
      this.framesById.set(id, frame);
    }
    return frame;
  }

  private onFrameAttached(params: { frameId: string; parentFrameId?: string }) {
    const frame = this.ensureFrame(params.frameId);
    frame.setMeta({ parentId: params.parentFrameId });
  }

  private onFrameNavigated(params: { frame: { id: string; name?: string; url?: string; parentId?: string } }) {
    const frame = this.ensureFrame(params.frame.id);
    frame.setMeta({ name: params.frame.name, url: params.frame.url, parentId: params.frame.parentId });
    if (!params.frame.parentId) {
      this.mainFrameId = params.frame.id;
    }
  }

  private onFrameDetached(params: { frameId: string }) {
    this.framesById.delete(params.frameId);
  }

  private onExecutionContextCreated(params: { context: { id: number; auxData?: { frameId?: string } } }) {
    const frameId = params.context.auxData?.frameId;
    if (!frameId) {
      return;
    }
    const frame = this.ensureFrame(frameId);
    frame.setExecutionContext(params.context.id);
  }

  private onExecutionContextDestroyed(params: { executionContextId: number }) {
    for (const frame of this.framesById.values()) {
      if (frame.getExecutionContext() === params.executionContextId) {
        frame.setExecutionContext(undefined);
      }
    }
  }

  private onExecutionContextsCleared() {
    for (const frame of this.framesById.values()) {
      frame.setExecutionContext(undefined);
    }
  }

  private onLifecycleEvent(params: { frameId: string; name: string }) {
    if (!this.lifecycleEvents.has(params.frameId)) {
      this.lifecycleEvents.set(params.frameId, new Set());
    }
    this.lifecycleEvents.get(params.frameId)!.add(params.name);
  }

  private async waitForLifecycle(frameId: string | undefined, eventName: string, timeoutMs: number) {
    if (!frameId) {
      throw new Error("Missing frame id for lifecycle wait");
    }
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const events = this.lifecycleEvents.get(frameId);
      if (events && events.has(eventName)) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`Timeout waiting for lifecycle event: ${eventName}`);
  }
}
