import type { PeerLink } from "./rtc";
import { BUFFER_HIGH } from "./rtc";
import type {
  ControlMessage,
  FileMeta,
  IncomingOffer,
  Platform,
  SharedText,
  TransferItem,
  TransferItemState,
} from "./types";

const CHUNK = 16 * 1024;
const PROGRESS_INTERVAL = 120; // ms
const OFFER_TIMEOUT = 120_000; // 2 minutes to accept

export type ItemPatch = Partial<Omit<TransferItem, "fileId" | "transferId">> & {
  fileId: string;
  transferId: string;
};

export interface EngineHooks {
  onItemInit: (items: TransferItem[]) => void;
  onPatch: (patch: ItemPatch) => void;
  onIncomingOffer: (offer: IncomingOffer) => void;
  onOfferResolved: (transferId: string) => void;
  onText: (m: SharedText) => void;
  onHello: (peer: { name: string; platform: Platform }) => void;
  onLatency: (ms: number | null) => void;
  onFileReady?: (file: { blob: Blob; meta: FileMeta }) => void;
}

interface Batch {
  transferId: string;
  files: File[];
  metas: FileMeta[];
}

interface Sample {
  t: number;
  bytes: number;
  speed: number;
}

interface RecvContext {
  transferId: string;
  meta: FileMeta;
  parts: ArrayBuffer[];
  received: number;
}

export function uid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

const ACTIVE_STATES: TransferItemState[] = ["waiting", "incoming", "transferring"];

export class TransferEngine {
  private link: PeerLink;
  private hooks: EngineHooks;
  private ownName: string;
  private ownPlatform: Platform;
  peer: { name: string; platform: Platform } | null = null;

  private queue: Batch[] = [];
  private active: Batch | null = null;
  private canceled = new Set<string>();
  private offerResolvers = new Map<string, (ids: string[] | null) => void>();
  private offerTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
  private recvOffers = new Map<string, IncomingOffer>();
  private recv: RecvContext | null = null;
  private samples = new Map<string, Sample>();
  private heartbeat: ReturnType<typeof setInterval> | null = null;
  private destroyed = false;

  constructor(
    link: PeerLink,
    hooks: EngineHooks,
    own: { name: string; platform: Platform }
  ) {
    this.link = link;
    this.hooks = hooks;
    this.ownName = own.name;
    this.ownPlatform = own.platform;
    this.sendJson({ kind: "hello", name: own.name, platform: own.platform });
    this.heartbeat = setInterval(() => {
      this.sendJson({ kind: "ping", t: Date.now() });
    }, 5000);
  }

  private sendJson(msg: ControlMessage): boolean {
    return this.link.send(JSON.stringify(msg));
  }

  /* ------------------------------ sending ------------------------------ */

  sendFiles(files: File[]) {
    if (this.destroyed || files.length === 0) return;
    const transferId = uid();
    const metas: FileMeta[] = files.map((f) => ({
      id: uid(),
      name: f.name || "file",
      size: f.size,
      type: f.type || "application/octet-stream",
    }));
    this.hooks.onItemInit(
      metas.map((m) => ({
        fileId: m.id,
        transferId,
        name: m.name,
        size: m.size,
        mime: m.type,
        direction: "send" as const,
        state: "waiting" as const,
        bytes: 0,
        speed: 0,
        eta: null,
        detail: "Queued",
        peerName: this.peer?.name,
      }))
    );
    this.queue.push({ transferId, files, metas });
    void this.pump();
  }

  private async pump() {
    if (this.active || this.destroyed) return;
    const batch = this.queue.shift();
    if (!batch) return;
    this.active = batch;

    for (const m of batch.metas) {
      this.patch(batch.transferId, m.id, { detail: "Waiting for approval" });
    }
    this.sendJson({
      kind: "offer-files",
      transferId: batch.transferId,
      files: batch.metas,
      totalSize: batch.metas.reduce((a, b) => a + b.size, 0),
    });

    const accepted = await this.waitForAccept(batch.transferId);

    if (this.destroyed) {
      this.active = null;
      return;
    }
    if (this.canceled.has(batch.transferId)) {
      this.patchAll(batch, { state: "canceled", detail: "Canceled" });
      this.finishBatch();
      return;
    }
    if (!accepted) {
      this.patchAll(batch, { state: "declined", detail: "Declined by receiver" });
      this.finishBatch();
      return;
    }

    for (const meta of batch.metas) {
      if (!accepted.includes(meta.id)) continue;
      if (this.canceled.has(batch.transferId)) {
        this.patch(batch.transferId, meta.id, { state: "canceled", detail: "Canceled" });
        continue;
      }
      const file = batch.files[batch.metas.indexOf(meta)];
      if (!file) {
        this.patch(batch.transferId, meta.id, { state: "failed", detail: "File unavailable" });
        continue;
      }
      await this.streamFile(batch.transferId, meta, file);
    }

    this.sendJson({ kind: "transfer-complete", transferId: batch.transferId });
    this.finishBatch();
  }

  private finishBatch() {
    this.active = null;
    void this.pump();
  }

  private patchAll(batch: Batch, p: Partial<TransferItem>) {
    for (const m of batch.metas) {
      this.patch(batch.transferId, m.id, { ...p, completedAt: p.state ? Date.now() : undefined });
    }
  }

  private waitForAccept(transferId: string): Promise<string[] | null> {
    return new Promise((resolve) => {
      this.offerResolvers.set(transferId, resolve);
      const timeout = setTimeout(() => {
        if (this.offerResolvers.delete(transferId)) {
          for (const batch of [this.active, ...this.queue]) {
            if (batch && batch.transferId === transferId) {
              for (const m of batch.metas) {
                this.patch(transferId, m.id, {
                  state: "failed",
                  detail: "No response — offer expired",
                  completedAt: Date.now(),
                });
              }
            }
          }
          resolve(null);
        }
      }, OFFER_TIMEOUT);
      this.offerTimeouts.set(transferId, timeout);
    });
  }

  private async streamFile(transferId: string, meta: FileMeta, file: File): Promise<void> {
    if (!this.link.send(JSON.stringify({ kind: "file-start", transferId, fileId: meta.id } satisfies ControlMessage))) {
      this.patch(transferId, meta.id, { state: "failed", detail: "Connection lost", completedAt: Date.now() });
      return;
    }
    const startedAt = Date.now();
    this.patch(transferId, meta.id, { state: "transferring", detail: undefined, startedAt });

    let offset = 0;
    while (offset < file.size) {
      if (this.canceled.has(transferId) || this.destroyed) {
        this.patch(transferId, meta.id, { state: "canceled", detail: "Canceled", completedAt: Date.now() });
        return;
      }
      if (!this.link.isOpen) {
        this.patch(transferId, meta.id, { state: "failed", detail: "Connection lost", completedAt: Date.now() });
        return;
      }
      if (this.link.bufferedAmount > BUFFER_HIGH) {
        const drained = await this.link.waitForDrain();
        if (!drained) {
          this.patch(transferId, meta.id, { state: "failed", detail: "Connection stalled", completedAt: Date.now() });
          return;
        }
        continue;
      }
      let buf: ArrayBuffer;
      try {
        buf = await file.slice(offset, Math.min(offset + CHUNK, file.size)).arrayBuffer();
      } catch {
        this.patch(transferId, meta.id, { state: "failed", detail: "Could not read file", completedAt: Date.now() });
        return;
      }
      if (!this.link.send(buf)) {
        this.patch(transferId, meta.id, { state: "failed", detail: "Connection lost", completedAt: Date.now() });
        return;
      }
      offset += buf.byteLength;
      this.progress(transferId, meta.id, offset, meta.size);
    }

    this.sendJson({ kind: "file-end", transferId, fileId: meta.id });
    this.progress(transferId, meta.id, meta.size, meta.size, true);
    this.patch(transferId, meta.id, {
      state: "completed",
      detail: undefined,
      bytes: meta.size,
      speed: 0,
      eta: null,
      completedAt: Date.now(),
    });
  }

  /* ------------------------------ receiving ---------------------------- */

  handleData(data: string | ArrayBuffer) {
    if (typeof data === "string") {
      let msg: ControlMessage;
      try {
        msg = JSON.parse(data) as ControlMessage;
      } catch {
        return;
      }
      this.handleControl(msg);
      return;
    }
    // Binary chunk for the file currently being received.
    const ctx = this.recv;
    if (!ctx || this.canceled.has(ctx.transferId)) return;
    ctx.parts.push(data);
    ctx.received += data.byteLength;
    this.progress(ctx.transferId, ctx.meta.id, ctx.received, ctx.meta.size);
  }

  private handleControl(msg: ControlMessage) {
    switch (msg.kind) {
      case "hello":
        this.peer = { name: msg.name, platform: msg.platform };
        this.hooks.onHello(this.peer);
        break;
      case "ping":
        this.sendJson({ kind: "pong", t: msg.t });
        break;
      case "pong":
        this.hooks.onLatency(Math.max(0, Date.now() - msg.t));
        break;
      case "text":
        this.hooks.onText({
          id: msg.id,
          text: msg.text,
          direction: "receive",
          from: this.peer?.name ?? "Other device",
          at: Date.now(),
        });
        break;
      case "offer-files": {
        const offer: IncomingOffer = {
          transferId: msg.transferId,
          files: msg.files,
          totalSize: msg.totalSize,
          from: this.peer?.name ?? "Other device",
        };
        this.recvOffers.set(msg.transferId, offer);
        this.hooks.onItemInit(
          msg.files.map((m) => ({
            fileId: m.id,
            transferId: msg.transferId,
            name: m.name,
            size: m.size,
            mime: m.type,
            direction: "receive" as const,
            state: "incoming" as const,
            bytes: 0,
            speed: 0,
            eta: null,
            peerName: offer.from,
          }))
        );
        this.hooks.onIncomingOffer(offer);
        break;
      }
      case "accept": {
        const resolve = this.offerResolvers.get(msg.transferId);
        if (resolve) {
          this.offerResolvers.delete(msg.transferId);
          this.clearOfferTimeout(msg.transferId);
          resolve(msg.fileIds);
        }
        break;
      }
      case "decline": {
        const resolve = this.offerResolvers.get(msg.transferId);
        if (resolve) {
          this.offerResolvers.delete(msg.transferId);
          this.clearOfferTimeout(msg.transferId);
          resolve(null);
        }
        break;
      }
      case "file-start": {
        const offer = this.recvOffers.get(msg.transferId);
        const meta = offer?.files.find((f) => f.id === msg.fileId);
        if (!meta) break;
        if (this.canceled.has(msg.transferId)) {
          this.recv = null;
          break;
        }
        this.recv = { transferId: msg.transferId, meta, parts: [], received: 0 };
        this.patch(msg.transferId, msg.fileId, {
          state: "transferring",
          startedAt: Date.now(),
        });
        break;
      }
      case "file-end": {
        const ctx = this.recv;
        if (!ctx || ctx.transferId !== msg.transferId || ctx.meta.id !== msg.fileId) break;
        this.recv = null;
        if (this.canceled.has(msg.transferId)) {
          this.patch(msg.transferId, msg.fileId, { state: "canceled", detail: "Canceled", completedAt: Date.now() });
          break;
        }
        const blob = new Blob(ctx.parts, { type: ctx.meta.type });
        this.progress(msg.transferId, msg.fileId, ctx.meta.size, ctx.meta.size, true);
        this.patch(msg.transferId, msg.fileId, {
          state: "completed",
          bytes: ctx.meta.size,
          speed: 0,
          eta: null,
          completedAt: Date.now(),
        });
        if (this.hooks.onFileReady) this.hooks.onFileReady({ blob, meta: ctx.meta });
        else downloadBlob(blob, ctx.meta.name);
        break;
      }
      case "transfer-complete":
        this.recvOffers.delete(msg.transferId);
        break;
      case "cancel":
        this.handleRemoteCancel(msg.transferId, msg.fileId);
        break;
    }
  }

  private handleRemoteCancel(transferId: string, fileId?: string) {
    this.canceled.add(transferId);
    const resolve = this.offerResolvers.get(transferId);
    if (resolve) {
      this.offerResolvers.delete(transferId);
      this.clearOfferTimeout(transferId);
      resolve(null);
    }
    if (this.recv && this.recv.transferId === transferId) this.recv = null;
    const offer = this.recvOffers.get(transferId);
    if (offer) {
      for (const f of offer.files) {
        if (fileId && f.id !== fileId) continue;
        this.patch(transferId, f.id, { state: "canceled", detail: "Canceled by sender", completedAt: Date.now() });
      }
      this.recvOffers.delete(transferId);
    }
    if (this.active && this.active.transferId === transferId) {
      for (const m of this.active.metas) {
        this.patch(transferId, m.id, { state: "canceled", detail: "Canceled by receiver", completedAt: Date.now() });
      }
    }
    this.hooks.onOfferResolved(transferId);
  }

  /* --------------------------- public actions -------------------------- */

  acceptOffer(transferId: string) {
    const offer = this.recvOffers.get(transferId);
    if (!offer) return;
    this.canceled.delete(transferId);
    this.sendJson({ kind: "accept", transferId, fileIds: offer.files.map((f) => f.id) });
    for (const f of offer.files) {
      this.patch(transferId, f.id, { state: "waiting", detail: "Starting…" });
    }
    this.hooks.onOfferResolved(transferId);
  }

  declineOffer(transferId: string) {
    const offer = this.recvOffers.get(transferId);
    this.sendJson({ kind: "decline", transferId });
    this.canceled.add(transferId);
    if (offer) {
      for (const f of offer.files) {
        this.patch(transferId, f.id, { state: "declined", detail: "Declined", completedAt: Date.now() });
      }
      this.recvOffers.delete(transferId);
    }
    this.hooks.onOfferResolved(transferId);
  }

  cancelTransfer(transferId: string) {
    if (this.canceled.has(transferId)) return;
    this.canceled.add(transferId);
    this.sendJson({ kind: "cancel", transferId });
    const resolve = this.offerResolvers.get(transferId);
    if (resolve) {
      this.offerResolvers.delete(transferId);
      this.clearOfferTimeout(transferId);
      resolve(null);
    }
    this.queue = this.queue.filter((b) => b.transferId !== transferId);
    if (this.recv && this.recv.transferId === transferId) this.recv = null;
    const offer = this.recvOffers.get(transferId);
    if (offer) {
      for (const f of offer.files) {
        this.patch(transferId, f.id, { state: "canceled", detail: "Canceled", completedAt: Date.now() });
      }
      this.recvOffers.delete(transferId);
    }
    if (this.active && this.active.transferId === transferId) {
      for (const m of this.active.metas) {
        this.patch(transferId, m.id, { state: "canceled", detail: "Canceled", completedAt: Date.now() });
      }
    }
    this.hooks.onOfferResolved(transferId);
  }

  sendText(text: string) {
    const trimmed = text.trim();
    if (!trimmed || this.destroyed) return;
    const id = uid();
    this.sendJson({ kind: "text", id, text: trimmed.slice(0, 8000) });
    this.hooks.onText({
      id,
      text: trimmed.slice(0, 8000),
      direction: "send",
      from: this.ownName,
      at: Date.now(),
    });
  }

  renameOwn(name: string) {
    this.ownName = name;
    this.sendJson({ kind: "hello", name, platform: this.ownPlatform });
  }

  /* ------------------------------ internals ---------------------------- */

  private patch(transferId: string, fileId: string, p: Partial<TransferItem>) {
    if (this.destroyed) return; // after teardown the app layer owns item state
    this.hooks.onPatch({ transferId, fileId, ...p });
  }

  private clearOfferTimeout(transferId: string) {
    const t = this.offerTimeouts.get(transferId);
    if (t) clearTimeout(t);
    this.offerTimeouts.delete(transferId);
  }

  private progress(transferId: string, fileId: string, bytes: number, total: number, force = false) {
    const key = `${transferId}:${fileId}`;
    const now = Date.now();
    const last = this.samples.get(key);
    if (!force && last && now - last.t < PROGRESS_INTERVAL) return;
    if (!last) {
      this.samples.set(key, { t: now, bytes, speed: 0 });
      this.patch(transferId, fileId, { bytes, speed: 0, eta: null, state: "transferring" });
      return;
    }
    const dt = (now - last.t) / 1000;
    const inst = dt > 0 ? (bytes - last.bytes) / dt : 0;
    const speed = last.speed * 0.55 + inst * 0.45;
    const remaining = total - bytes;
    const eta = speed > 0 && remaining > 0 ? remaining / speed : 0;
    this.samples.set(key, { t: now, bytes, speed });
    this.patch(transferId, fileId, {
      bytes: Math.min(bytes, total),
      speed,
      eta,
      state: "transferring",
    });
  }

  destroy() {
    this.destroyed = true;
    if (this.heartbeat) clearInterval(this.heartbeat);
    for (const t of this.offerTimeouts.values()) clearTimeout(t);
    this.offerTimeouts.clear();
    this.offerResolvers.forEach((r) => r(null));
    this.offerResolvers.clear();
    this.queue = [];
  }
}
