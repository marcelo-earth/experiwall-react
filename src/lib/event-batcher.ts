import type { ExperiwallEvent } from "./types";
import { sendEvents } from "./api-client";

const FLUSH_INTERVAL_MS = 30_000;

export class EventBatcher {
  private queue: ExperiwallEvent[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private apiKey: string;
  private baseUrl?: string;
  private userId?: string;
  private aliasId?: string;

  constructor(opts: {
    apiKey: string;
    baseUrl?: string;
    userId?: string;
    aliasId?: string;
  }) {
    this.apiKey = opts.apiKey;
    this.baseUrl = opts.baseUrl;
    this.userId = opts.userId;
    this.aliasId = opts.aliasId;
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.flush(), FLUSH_INTERVAL_MS);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.flush();
  }

  push(event: ExperiwallEvent) {
    this.queue.push({
      ...event,
      timestamp: event.timestamp ?? new Date().toISOString(),
    });
  }

  async flush() {
    if (this.queue.length === 0) return;

    const batch = this.queue.splice(0);
    try {
      await sendEvents(this.apiKey, batch, {
        baseUrl: this.baseUrl,
        userId: this.userId,
        aliasId: this.aliasId,
      });
    } catch {
      // Re-enqueue on failure
      this.queue.unshift(...batch);
    }
  }
}
