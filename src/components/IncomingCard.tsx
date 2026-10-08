"use client";

import { ArrowDownToLine, Check, FileText, X } from "lucide-react";
import type { IncomingOffer } from "@/lib/types";
import { formatBytes } from "@/lib/format";

export function IncomingCard({
  offer,
  onAccept,
  onDecline,
}: {
  offer: IncomingOffer;
  onAccept: (transferId: string) => void;
  onDecline: (transferId: string) => void;
}) {
  const shown = offer.files.slice(0, 3);
  const extra = offer.files.length - shown.length;
  const single = offer.files.length === 1;

  return (
    <div className="glass anim-fade-up rounded-[22px] border-[rgba(10,132,255,0.25)] p-5">
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 flex-none items-center justify-center rounded-[14px] border border-[rgba(10,132,255,0.3)] bg-[rgba(10,132,255,0.12)] text-[#5ea8ff]">
          <ArrowDownToLine className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold tracking-tight text-white">
            Incoming {single ? "file" : `${offer.files.length} files`}
          </p>
          <p className="mt-0.5 text-[12.5px] text-white/45">
            from <span className="font-medium text-white/70">{offer.from}</span> ·{" "}
            <span className="tabular">{formatBytes(offer.totalSize)}</span>
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-1.5">
        {shown.map((f) => (
          <div
            key={f.id}
            className="flex items-center gap-2.5 rounded-[12px] bg-white/[0.045] px-3 py-2"
          >
            <FileText className="h-3.5 w-3.5 flex-none text-white/35" />
            <span className="min-w-0 flex-1 truncate text-[12.5px] text-white/75">{f.name}</span>
            <span className="tabular flex-none text-[11px] text-white/35">{formatBytes(f.size)}</span>
          </div>
        ))}
        {extra > 0 ? (
          <p className="px-1 text-[11.5px] text-white/35">+ {extra} more</p>
        ) : null}
      </div>

      <div className="mt-5 flex gap-2.5">
        <button type="button" className="btn btn-primary flex-1" onClick={() => onAccept(offer.transferId)}>
          <Check className="h-4 w-4" strokeWidth={2.5} />
          Accept
        </button>
        <button type="button" className="btn btn-glass flex-1" onClick={() => onDecline(offer.transferId)}>
          <X className="h-4 w-4" />
          Decline
        </button>
      </div>
    </div>
  );
}
