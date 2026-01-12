import { EventEmitter } from "events";

export type ActionEvent = {
  name: string;
  selector?: string;
  frameId?: string;
  durationMs?: number;
  sensitive?: boolean;
};

export type AssertionEvent = {
  name: string;
  selector?: string;
  frameId?: string;
  durationMs?: number;
};

export type AutomationEventMap = {
  "action:start": ActionEvent;
  "action:end": ActionEvent;
  "assertion:start": AssertionEvent;
  "assertion:end": AssertionEvent;
};

export class AutomationEvents {
  private emitter = new EventEmitter();

  on<K extends keyof AutomationEventMap>(event: K, handler: (payload: AutomationEventMap[K]) => void) {
    this.emitter.on(event, handler);
  }

  off<K extends keyof AutomationEventMap>(event: K, handler: (payload: AutomationEventMap[K]) => void) {
    this.emitter.off(event, handler);
  }

  emit<K extends keyof AutomationEventMap>(event: K, payload: AutomationEventMap[K]) {
    this.emitter.emit(event, payload);
  }
}
