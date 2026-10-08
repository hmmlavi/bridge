import type { ConnectionInfo } from "./types";

export type SignalMessage =
  | { type: "kick"; name?: string }
  | { type: "offer"; sdp: RTCSessionDescriptionInit }
  | { type: "answer"; sdp: RTCSessionDescriptionInit }
  | { type: "ice"; candidate: RTCIceCandidateInit | null };

export interface PeerLinkHandlers {
  onSignal: (msg: SignalMessage) => void;
  onChannelOpen: () => void;
  onChannelClose: () => void;
  onMessage: (data: string | ArrayBuffer) => void;
  onStateChange?: (state: RTCPeerConnectionState) => void;
  onInfo?: (info: ConnectionInfo) => void;
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
];

export const BUFFER_LOW = 256 * 1024;
export const BUFFER_HIGH = 2 * 1024 * 1024;

export class PeerLink {
  readonly pc: RTCPeerConnection;
  channel: RTCDataChannel | null = null;
  private handlers: PeerLinkHandlers;
  private remoteSet = false;
  private pendingIce: RTCIceCandidateInit[] = [];
  private statsTimer: ReturnType<typeof setInterval> | null = null;
  private closed = false;

  constructor(handlers: PeerLinkHandlers, initiator: boolean) {
    this.handlers = handlers;
    this.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    this.pc.onicecandidate = (e) => {
      handlers.onSignal({
        type: "ice",
        candidate: e.candidate ? e.candidate.toJSON() : null,
      });
    };
    this.pc.onconnectionstatechange = () => {
      handlers.onStateChange?.(this.pc.connectionState);
      if (this.pc.connectionState === "failed") {
        this.handlers.onChannelClose();
      }
    };
    this.pc.ondatachannel = (e) => this.setupChannel(e.channel);
    if (initiator) {
      this.setupChannel(this.pc.createDataChannel("bridge", { ordered: true }));
    }
  }

  private setupChannel(ch: RTCDataChannel) {
    this.channel = ch;
    ch.binaryType = "arraybuffer";
    ch.bufferedAmountLowThreshold = BUFFER_LOW;
    ch.onopen = () => {
      this.startStats();
      this.handlers.onChannelOpen();
    };
    ch.onclose = () => this.handlers.onChannelClose();
    ch.onerror = () => this.handlers.onChannelClose();
    ch.onmessage = (e) => {
      this.handlers.onMessage(e.data as string | ArrayBuffer);
    };
  }

  async makeOffer() {
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    if (this.pc.localDescription) {
      this.handlers.onSignal({ type: "offer", sdp: this.pc.localDescription.toJSON() });
    }
  }

  async handleSignal(msg: SignalMessage) {
    if (this.closed) return;
    try {
      if (msg.type === "offer") {
        await this.pc.setRemoteDescription(msg.sdp);
        this.remoteSet = true;
        await this.flushIce();
        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);
        if (this.pc.localDescription) {
          this.handlers.onSignal({
            type: "answer",
            sdp: this.pc.localDescription.toJSON(),
          });
        }
      } else if (msg.type === "answer") {
        await this.pc.setRemoteDescription(msg.sdp);
        this.remoteSet = true;
        await this.flushIce();
      } else if (msg.type === "ice") {
        if (!msg.candidate) return;
        if (!this.remoteSet) {
          this.pendingIce.push(msg.candidate);
          return;
        }
        await this.pc.addIceCandidate(msg.candidate);
      }
    } catch {
      // Swallow individual ICE/SDP races — the connection state machine reports real failure.
    }
  }

  private async flushIce() {
    const queued = this.pendingIce.splice(0);
    for (const c of queued) {
      try {
        await this.pc.addIceCandidate(c);
      } catch {
        /* stale candidate */
      }
    }
  }

  private startStats() {
    if (this.statsTimer) return;
    const poll = async () => {
      if (this.closed) return;
      try {
        const stats = await this.pc.getStats();
        type CandidateStatsLike = { candidateType?: string };
        let pair: RTCIceCandidatePairStats | null = null;
        const candidates = new Map<string, CandidateStatsLike>();
        stats.forEach((r) => {
          if (r.type === "local-candidate" || r.type === "remote-candidate") {
            candidates.set(r.id, r as unknown as CandidateStatsLike);
          }
          if (r.type === "candidate-pair") {
            const p = r as RTCIceCandidatePairStats;
            if (p.nominated || p.state === "succeeded") pair ??= p;
          }
        });
        if (pair) {
          const p = pair as RTCIceCandidatePairStats & { selected?: boolean };
          const local = candidates.get(p.localCandidateId);
          const remote = candidates.get(p.remoteCandidateId);
          const relay =
            local?.candidateType === "relay" || remote?.candidateType === "relay";
          const info: ConnectionInfo = {
            kind: relay ? "relay" : local || remote ? "direct" : "unknown",
            rttMs:
              typeof p.currentRoundTripTime === "number"
                ? Math.round(p.currentRoundTripTime * 1000)
                : null,
          };
          this.handlers.onInfo?.(info);
        }
      } catch {
        /* stats unsupported */
      }
    };
    void poll();
    this.statsTimer = setInterval(poll, 4000);
  }

  get bufferedAmount(): number {
    return this.channel?.bufferedAmount ?? 0;
  }

  get isOpen(): boolean {
    return this.channel?.readyState === "open";
  }

  get connectionState(): RTCPeerConnectionState {
    return this.pc.connectionState;
  }

  send(data: string | ArrayBuffer): boolean {
    if (!this.channel || this.channel.readyState !== "open") return false;
    try {
      if (typeof data === "string") this.channel.send(data);
      else this.channel.send(data);
      return true;
    } catch {
      return false;
    }
  }

  waitForDrain(timeoutMs = 15000): Promise<boolean> {
    return new Promise((resolve) => {
      const ch = this.channel;
      if (!ch) return resolve(false);
      if (ch.bufferedAmount <= BUFFER_LOW) return resolve(true);
      let done = false;
      const finish = (ok: boolean) => {
        if (done) return;
        done = true;
        ch.removeEventListener("bufferedamountlow", onLow);
        clearTimeout(timer);
        resolve(ok);
      };
      const onLow = () => finish(true);
      const timer = setTimeout(() => finish(false), timeoutMs);
      ch.addEventListener("bufferedamountlow", onLow);
    });
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    if (this.statsTimer) clearInterval(this.statsTimer);
    try {
      this.channel?.close();
    } catch {
      /* noop */
    }
    try {
      this.pc.close();
    } catch {
      /* noop */
    }
  }
}
