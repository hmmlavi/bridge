"use client";

import type { Role } from "./types";

export interface ChannelSnapshot {
  pcName: string;
  phoneName: string | null;
  joined: boolean;
  expiresAt: number;
}

interface ChannelEvent {
  id: number;
  event: string;
  data: unknown;
}

type Listener = (data: unknown) => void;

/**
 * Resilient short-polling event channel — a drop-in replacement for the
 * EventSource pattern that works identically on serverless platforms
 * (Vercel, multi-instance) where long-lived SSE streams and shared memory
 * are unavailable. Emits terminal pseudo-events:
 *   "session-expired" (410) · "session-gone" (404) · "forbidden" (403)
 */
export class SessionChannel {
  private listeners = new Map<string, Set<Listener>>();
  private after = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private closedFlag = false;
  private ticking = false;
  private intervalMs: number;
  private lastSnapshotJson = "";
  private onVisibility: () => void;

  constructor(
    private opts: { sessionId: string; token: string; role: Role; intervalMs?: number }
  ) {
    this.intervalMs = opts.intervalMs ?? 1500;
    this.onVisibility = () => {
      if (document.visibilityState === "visible" && !this.closedFlag) void this.tick();
    };
  }

  on(event: string, cb: Listener): this {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(cb);
    return this;
  }

  private emit(event: string, data: unknown) {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const cb of set) {
      try {
        cb(data);
      } catch {
        /* listener errors must not break the channel */
      }
    }
  }

  setIntervalMs(ms: number) {
    this.intervalMs = ms;
  }

  start() {
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", this.onVisibility);
    }
    void this.tick();
  }

  close() {
    if (this.closedFlag) return;
    this.closedFlag = true;
    if (this.timer) clearTimeout(this.timer);
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", this.onVisibility);
    }
    this.listeners.clear();
  }

  private schedule() {
    if (this.closedFlag) return;
    this.timer = setTimeout(() => void this.tick(), this.intervalMs);
  }

  private async tick() {
    if (this.closedFlag || this.ticking) return;
    this.ticking = true;
    try {
      const url = `/api/sessions/${encodeURIComponent(this.opts.sessionId)}/events?role=${
        this.opts.role
      }&k=${encodeURIComponent(this.opts.token)}&after=${this.after}`;
      const res = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(12_000),
      });
      if (res.status === 410) {
        this.emit("session-expired", {});
        this.close();
        return;
      }
      if (res.status === 404) {
        this.emit("session-gone", {});
        this.close();
        return;
      }
      if (res.status === 403) {
        this.emit("forbidden", {});
        this.close();
        return;
      }
      if (res.ok) {
        const data = (await res.json()) as { events: ChannelEvent[]; snapshot: ChannelSnapshot };
        const snap = JSON.stringify(data.snapshot);
        if (snap !== this.lastSnapshotJson) {
          this.lastSnapshotJson = snap;
          this.emit("ready", data.snapshot);
        }
        for (const ev of data.events ?? []) {
          if (typeof ev.id === "number" && ev.id > this.after) this.after = ev.id;
          this.emit(ev.event, ev.data);
        }
      }
      // Other non-OK statuses (502, 503, cold lambdas) retry on next tick.
    } catch {
      // Network hiccup — retry on next tick.
    } finally {
      this.ticking = false;
      this.schedule();
    }
  }
}
