"use client";

import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Check,
  File,
  FileArchive,
  FileAudio2,
  FileCode2,
  FileSpreadsheet,
  FileText,
  FileType2,
  FileVideo2,
  Image as ImageIcon,
  OctagonAlert,
  Presentation,
  Slash,
  X,
} from "lucide-react";
import type { TransferItem } from "@/lib/types";
import { formatBytes, formatEta, formatSpeed } from "@/lib/format";
import { EmptyState, Label } from "./ui";

function fileIcon(mime: string, name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const cls = "h-[18px] w-[18px]";
  if (mime.startsWith("image/")) return <ImageIcon className={cls} />;
  if (mime.startsWith("video/")) return <FileVideo2 className={cls} />;
  if (mime.startsWith("audio/")) return <FileAudio2 className={cls} />;
  if (mime === "application/pdf" || ext === "pdf") return <FileText className={cls} />;
  if (mime.includes("word") || ext === "doc" || ext === "docx") return <FileType2 className={cls} />;
  if (mime.includes("sheet") || mime.includes("excel") || ["xls", "xlsx", "csv"].includes(ext))
    return <FileSpreadsheet className={cls} />;
  if (mime.includes("presentation") || ["ppt", "pptx", "key"].includes(ext))
    return <Presentation className={cls} />;
  if (
    mime.includes("zip") ||
    mime.includes("compressed") ||
    ["zip", "rar", "7z", "tar", "gz", "bz2"].includes(ext)
  )
    return <FileArchive className={cls} />;
  if (
    ["js", "ts", "tsx", "jsx", "py", "java", "c", "cpp", "h", "cs", "go", "rs", "rb", "php", "html", "css", "json", "xml", "yml", "yaml", "sh", "sql", "swift", "kt"].includes(ext) ||
    mime.includes("json")
  )
    return <FileCode2 className={cls} />;
  if (mime.startsWith("text/") || ["txt", "md", "log"].includes(ext)) return <FileText className={cls} />;
  return <File className={cls} />;
}

const TERMINAL = new Set(["completed", "failed", "canceled", "declined"]);

export function TransferCard({
  item,
  onCancel,
}: {
  item: TransferItem;
  onCancel: (transferId: string) => void;
}) {
  const pct = item.size > 0 ? Math.min(100, (item.bytes / item.size) * 100) : item.state === "completed" ? 100 : 0;
  const active = item.state === "transferring";
  const cancellable = !TERMINAL.has(item.state);

  const stateText =
    item.state === "completed"
      ? "Completed"
      : item.state === "failed"
        ? (item.detail ?? "Failed")
        : item.state === "canceled"
          ? (item.detail ?? "Canceled")
          : item.state === "declined"
            ? "Declined"
            : item.state === "incoming"
              ? "Waiting for your approval"
              : item.state === "waiting"
                ? (item.detail ?? "Waiting")
                : null;

  return (
    <div className="glass-flat hover-lift rounded-[18px] p-3.5">
      <div className="flex items-center gap-3">
        <span className="glass-2 flex h-10 w-10 flex-none items-center justify-center rounded-[12px] text-white/75">
          {fileIcon(item.mime, item.name)}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-medium tracking-[-0.01em] text-white/90">
            {item.name}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-white/40">
            {item.direction === "send" ? (
              <ArrowUpFromLine className="h-3 w-3 text-white/35" />
            ) : (
              <ArrowDownToLine className="h-3 w-3 text-white/35" />
            )}
            <span className="tabular">{formatBytes(item.size)}</span>
            {item.peerName ? <span className="truncate">· {item.direction === "send" ? "to" : "from"} {item.peerName}</span> : null}
          </p>
        </div>

        <div className="flex flex-none items-center gap-2">
          {active ? (
            <span className="tabular text-[13px] font-semibold text-white/85">
              {pct < 10 ? pct.toFixed(1) : Math.round(pct)}%
            </span>
          ) : null}
          {item.state === "completed" ? (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[rgba(48,209,88,0.12)] text-[#4ade80]">
              <Check className="h-4 w-4" strokeWidth={2.5} />
            </span>
          ) : null}
          {item.state === "failed" ? (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[rgba(255,107,98,0.10)] text-[#ff8a80]">
              <OctagonAlert className="h-4 w-4" />
            </span>
          ) : null}
          {item.state === "canceled" || item.state === "declined" ? (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.06] text-white/35">
              <Slash className="h-3.5 w-3.5" />
            </span>
          ) : null}
          {cancellable ? (
            <button
              type="button"
              className="btn-icon"
              aria-label="Cancel transfer"
              onClick={() => onCancel(item.transferId)}
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      {active || item.state === "waiting" || item.state === "incoming" ? (
        <div className="mt-3">
          <div
            className="track"
            role="progressbar"
            aria-label={`Transfer progress for ${item.name}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(pct)}
            aria-valuetext={`${Math.round(pct)} percent of ${item.name}`}
          >
            <div
              className={`fill ${item.state === "completed" ? "fill-done" : ""} ${active ? "" : "fill-muted"}`}
              style={{ width: `${active ? Math.max(2, pct) : 0}%`, opacity: active ? 1 : 0.35 }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-white/45">
            <span className="truncate">{stateText}</span>
            {active ? (
              <span className="tabular flex-none pl-3 text-white/55">
                {formatSpeed(item.speed)}
                {item.eta != null && item.eta > 0 ? ` · ${formatEta(item.eta)}` : ""}
                {item.size > 0 ? ` · ${formatBytes(Math.max(0, item.size - item.bytes))} left` : ""}
              </span>
            ) : null}
          </div>
        </div>
      ) : stateText && item.state !== "completed" ? (
        <p className={`mt-2 text-[11px] ${item.state === "failed" ? "text-[#ff8a80]/80" : "text-white/35"}`}>
          {stateText}
        </p>
      ) : null}
    </div>
  );
}

export function TransferList({
  items,
  onCancel,
  onClearFinished,
  emptyHint,
}: {
  items: TransferItem[];
  onCancel: (transferId: string) => void;
  onClearFinished: () => void;
  emptyHint: string;
}) {
  const hasFinished = items.some((i) => TERMINAL.has(i.state));
  return (
    <section className="anim-fade-up">
      <div className="mb-3 flex items-center justify-between">
        <Label>Transfers</Label>
        {hasFinished ? (
          <button
            type="button"
            onClick={onClearFinished}
            className="text-[11.5px] font-medium text-white/45 transition-colors hover:text-white/70"
          >
            Clear finished
          </button>
        ) : null}
      </div>
      {items.length === 0 ? (
        <EmptyState
          icon={<ArrowUpFromLine className="h-5 w-5" />}
          title="Nothing in flight"
          hint={emptyHint}
        />
      ) : (
        <div className="stagger flex flex-col gap-2.5">
          {items.map((item) => (
            <TransferCard key={`${item.transferId}:${item.fileId}`} item={item} onCancel={onCancel} />
          ))}
        </div>
      )}
    </section>
  );
}
