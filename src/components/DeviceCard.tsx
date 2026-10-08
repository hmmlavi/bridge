"use client";

import { Lock, Monitor, Smartphone, Unplug, Zap } from "lucide-react";
import type { ConnectionInfo, Platform } from "@/lib/types";
import { platformLabel } from "@/lib/device";
import { StatusPill } from "./ui";

export function DeviceCard({
  name,
  platform,
  info,
  latency,
  onDisconnect,
  compact = false,
}: {
  name: string;
  platform: Platform;
  info: ConnectionInfo;
  latency: number | null;
  onDisconnect: () => void;
  compact?: boolean;
}) {
  const PlatformIcon = platform === "android" || platform === "ios" ? Smartphone : Monitor;
  const rtt = latency ?? info.rttMs;

  return (
    <div className={`glass rounded-[22px] ${compact ? "p-4" : "p-5"}`}>
      <div className="flex items-center gap-3.5">
        <span className="glass-2 flex h-12 w-12 flex-none items-center justify-center rounded-[15px] text-white/85">
          <PlatformIcon className="h-[22px] w-[22px]" strokeWidth={1.7} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <StatusPill tone="connected">Connected</StatusPill>
          </div>
          <p className="mt-1.5 truncate text-[17px] font-semibold tracking-tight text-white">
            {name}
          </p>
          <p className="text-[11.5px] text-white/40">{platformLabel(platform)}</p>
        </div>
        <button
          type="button"
          className="btn-icon flex-none text-white/45 hover:text-[#ff8a80]"
          aria-label={`Disconnect ${name}`}
          title="Disconnect"
          onClick={onDisconnect}
        >
          <Unplug className="h-[18px] w-[18px]" />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-[13px] bg-white/[0.04] px-3 py-2.5">
          <div className="flex items-center gap-1 text-white/45">
            <Lock className="h-3 w-3" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em]">Security</span>
          </div>
          <p className="mt-1 text-[12px] font-medium text-white/75">Encrypted</p>
        </div>
        <div className="rounded-[13px] bg-white/[0.04] px-3 py-2.5">
          <div className="flex items-center gap-1 text-white/45">
            <Zap className="h-3 w-3" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em]">Path</span>
          </div>
          <p className="mt-1 text-[12px] font-medium text-white/75">
            {info.kind === "relay" ? "Relay" : info.kind === "direct" ? "Direct P2P" : "Peer-to-peer"}
          </p>
        </div>
        <div className="rounded-[13px] bg-white/[0.04] px-3 py-2.5">
          <div className="flex items-center gap-1 text-white/35">
            <span className="h-2 w-2 rounded-full bg-[#30d158]" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em]">Latency</span>
          </div>
          <p className="tabular mt-1 text-[12px] font-medium text-white/75">
            {rtt != null ? `${rtt} ms` : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}
