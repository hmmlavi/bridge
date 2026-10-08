"use client";

import { ArrowDownToLine, ArrowUpFromLine, MessageSquareText } from "lucide-react";
import type { HistoryEntry } from "@/lib/types";
import { formatBytes, formatClock } from "@/lib/format";
import { EmptyState, Label } from "./ui";

const STATUS_COLOR: Record<HistoryEntry["status"], string> = {
  completed: "#30d158",
  sent: "#30d158",
  received: "#30d158",
  failed: "#ff6b62",
  canceled: "rgba(255,255,255,0.35)",
  declined: "rgba(255,255,255,0.35)",
};

export function HistoryList({ entries }: { entries: HistoryEntry[] }) {
  return (
    <section className="anim-fade-up">
      <div className="mb-3">
        <Label>Recent activity</Label>
      </div>
      {entries.length === 0 ? (
        <EmptyState
          icon={<MessageSquareText className="h-5 w-5" />}
          title="No activity yet"
          hint="Completed transfers and shared text will show up here."
        />
      ) : (
        <div className="glass-flat divide-y divide-white/[0.05] overflow-hidden rounded-[18px]">
          {entries.map((e) => (
            <div key={e.id} className="flex items-center gap-3 px-4 py-3">
              <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-white/[0.05] text-white/45">
                {e.kind === "text" ? (
                  <MessageSquareText className="h-3.5 w-3.5" />
                ) : e.direction === "send" ? (
                  <ArrowUpFromLine className="h-3.5 w-3.5" />
                ) : (
                  <ArrowDownToLine className="h-3.5 w-3.5" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-medium text-white/75">{e.label}</p>
                <p className="mt-px truncate text-[11px] text-white/40">
                  {e.direction === "send" ? "to" : "from"} {e.peerName}
                  {e.size != null ? ` · ${formatBytes(e.size)}` : ""}
                </p>
              </div>
              <div className="flex flex-none items-center gap-2">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: STATUS_COLOR[e.status] }}
                  title={e.status}
                />
                <span className="tabular text-[11px] text-white/40">{formatClock(e.at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
