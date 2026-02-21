import type { ExperiwallEvent } from "./types";
import { sendEvents } from "./api-client";

const FLUSH_INTERVAL_MS = 30_000;
const MAX_QUEUE_SIZE = 1000;
const MAX_BACKOFF_MS = 60_000;

export class EventBatcher {
  private queue: ExperiwallEvent[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private apiKey: string;
  private baseUrl?: string;
  private userId?: string;
  private aliasId?: string;
  private backoffMs = 0;
  private backoffTimer: ReturnType<typeof setTimeout> | null = null;

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
    if (this.backoffTimer) {
      clearTimeout(this.backoffTimer);
      this.backoffTimer = null;
    }
    this.flush();
  }

  push(event: ExperiwallEvent) {
    // Cap queue size — drop oldest event if at limit
    if (this.queue.length >= MAX_QUEUE_SIZE) {
      this.queue.shift();
    }
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
      // Reset backoff on success
      this.backoffMs = 0;
    } catch (err: unknown) {
      // Re-enqueue failed batch
      this.queue.unshift(...batch);
      // Trim if re-enqueue pushed over limit
      if (this.queue.length > MAX_QUEUE_SIZE) {
        this.queue.splice(0, this.queue.length - MAX_QUEUE_SIZE);
      }

      const status = (err as { status?: number }).status;
      if (status === 429) {
        // Exponential backoff: 1s → 2s → 4s → ... → 60s
        this.backoffMs = Math.min(
          this.backoffMs === 0 ? 1000 : this.backoffMs * 2,
          MAX_BACKOFF_MS
        );
        this.backoffTimer = setTimeout(() => {
          this.backoffTimer = null;
          this.flush();
        }, this.backoffMs);
      }
    }
  }
}
