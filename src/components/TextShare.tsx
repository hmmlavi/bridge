"use client";

import { ArrowDownToLine, ArrowUpFromLine, Check, Copy, Link2, Send } from "lucide-react";
import { useState } from "react";
import type { SharedText } from "@/lib/types";
import { formatClock, splitTextAndUrls } from "@/lib/format";
import { Label } from "./ui";

function TextBody({ text }: { text: string }) {
  const parts = splitTextAndUrls(text);
  return (
    <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-white/85">
      {parts.map((p, i) =>
        p.url ? (
          <a
            key={i}
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[#5ea8ff] underline decoration-[#5ea8ff]/40 underline-offset-2 transition-colors hover:decoration-[#5ea8ff]"
          >
            {p.text}
          </a>
        ) : (
          <span key={i}>{p.text}</span>
        )
      )}
    </p>
  );
}

export function TextSharePanel({
  texts,
  onSend,
  placeholder,
  sendLabel,
}: {
  texts: SharedText[];
  onSend: (text: string) => void;
  placeholder: string;
  sendLabel: string;
}) {
  const [draft, setDraft] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const submit = () => {
    const t = draft.trim();
    if (!t) return;
    onSend(t);
    setDraft("");
  };

  const copy = async (m: SharedText) => {
    try {
      await navigator.clipboard.writeText(m.text);
      setCopiedId(m.id);
      setTimeout(() => setCopiedId((c) => (c === m.id ? null : c)), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <Label>Text &amp; links</Label>
      </div>

      <div className="glass-flat rounded-[18px] p-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
          }}
          rows={2}
          placeholder={placeholder}
          aria-label="Text or link to send to the other device"
          className="w-full resize-none bg-transparent px-3 py-2 text-[13.5px] leading-relaxed text-white/90 placeholder:text-white/40"
        />
        <div className="flex items-center justify-between px-1.5 pb-1">
          <span className="pl-1.5 text-[10.5px] text-white/40">
            {draft.length > 0 ? `${draft.length} chars` : "⌘/Ctrl + Enter to send"}
          </span>
          <button
            type="button"
            className="btn btn-primary h-9 px-4 text-[13px]"
            onClick={submit}
            disabled={!draft.trim()}
          >
            <Send className="h-3.5 w-3.5" />
            {sendLabel}
          </button>
        </div>
      </div>

      {texts.length > 0 ? (
        <div className="scroll-area mt-3 flex max-h-64 flex-col gap-2 overflow-y-auto pr-0.5">
          {[...texts].reverse().map((m) => (
            <div key={m.id} className="glass-flat anim-fade-in rounded-[16px] p-3.5">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-[0.08em] text-white/40">
                  {m.direction === "send" ? (
                    <ArrowUpFromLine className="h-3 w-3 flex-none" />
                  ) : (
                    <ArrowDownToLine className="h-3 w-3 flex-none" />
                  )}
                  <span className="truncate">{m.direction === "send" ? "You sent" : m.from}</span>
                  <span className="flex-none normal-case tracking-normal text-white/25">
                    · {formatClock(m.at)}
                  </span>
                  {/^https?:\/\/|^www\./.test(m.text.trim()) ? (
                    <Link2 className="h-3 w-3 flex-none text-[#5ea8ff]/70" />
                  ) : null}
                </span>
                <button
                  type="button"
                  className="btn-icon h-7 w-7 flex-none"
                  aria-label="Copy text"
                  onClick={() => void copy(m)}
                >
                  {copiedId === m.id ? (
                    <Check className="h-3.5 w-3.5 text-[#4ade80]" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
              <TextBody text={m.text} />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
