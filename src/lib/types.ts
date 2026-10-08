export type Role = "pc" | "phone";

export type Platform = "android" | "windows" | "ios" | "mac" | "linux" | "other";

export interface FileMeta {
  id: string;
  name: string;
  size: number;
  type: string;
}

export type TransferItemState =
  | "waiting" // queued locally or offered, not yet accepted
  | "incoming" // receiver: offer received, awaiting accept
  | "transferring"
  | "completed"
  | "failed"
  | "canceled"
  | "declined";

export type TransferDirection = "send" | "receive";

export interface TransferItem {
  fileId: string;
  transferId: string;
  name: string;
  size: number;
  mime: string;
  direction: TransferDirection;
  state: TransferItemState;
  bytes: number;
  speed: number; // bytes per second, smoothed
  eta: number | null; // seconds remaining
  detail?: string;
  peerName?: string;
  startedAt?: number;
  completedAt?: number;
}

export interface IncomingOffer {
  transferId: string;
  files: FileMeta[];
  totalSize: number;
  from: string;
}

export interface SharedText {
  id: string;
  text: string;
  direction: TransferDirection;
  from: string;
  at: number;
}

export interface ConnectionInfo {
  kind: "direct" | "relay" | "unknown";
  rttMs: number | null;
}

export interface HistoryEntry {
  id: string;
  kind: "file" | "text";
  label: string;
  size: number | null;
  direction: TransferDirection;
  peerName: string;
  at: number;
  status: "completed" | "failed" | "canceled" | "declined" | "sent" | "received";
}

/** Control messages exchanged over the data channel (everything else is binary). */
export type ControlMessage =
  | { kind: "hello"; name: string; platform: Platform }
  | { kind: "offer-files"; transferId: string; files: FileMeta[]; totalSize: number }
  | { kind: "accept"; transferId: string; fileIds: string[] }
  | { kind: "decline"; transferId: string }
  | { kind: "file-start"; transferId: string; fileId: string }
  | { kind: "file-end"; transferId: string; fileId: string }
  | { kind: "transfer-complete"; transferId: string }
  | { kind: "cancel"; transferId: string; fileId?: string }
  | { kind: "text"; id: string; text: string }
  | { kind: "ping"; t: number }
  | { kind: "pong"; t: number };
