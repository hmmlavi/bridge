"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { Loader2, RefreshCcw } from "lucide-react";
import { formatCountdown, shortId } from "@/lib/format";
import { StatusPill } from "./ui";

export function QrCard({
  value,
  sessionId,
  msLeft,
  totalMs,
  connecting,
  connectingName,
  onRefresh,
}: {
  value: string;
  sessionId: string;
  msLeft: number;
  totalMs: number;
  connecting: boolean;
  connectingName?: string | null;
  onRefresh: () => void;
}) {
  const [svg, setSvg] = useState("");

  useEffect(() => {
    let live = true;
    if (!value) {
      // Defer so the state update doesn't run synchronously inside the effect.
      Promise.resolve().then(() => {
        if (live) setSvg("");
      });
      return;
    }
    // margin is in modules — combined with the white panel padding this keeps a
    // comfortable quiet zone (~4 modules) so phone cameras scan reliably.
    QRCode.toString(value, {
      type: "svg",
      errorCorrectionLevel: "M",
      margin: 3,
      color: { dark: "#0a0a0c", light: "#ffffff" },
    })
      .then((s) => {
        if (live) setSvg(s);
      })
      .catch(() => {
        if (live) setSvg("");
      });
    return () => {
      live = false;
    };
  }, [value]);

  const frac = totalMs > 0 ? Math.max(0, Math.min(1, msLeft / totalMs)) : 0;
  const C = 2 * Math.PI * 7;

  return (
    <div className="glass anim-fade-up w-full max-w-[356px] rounded-[28px] p-5">
      <div className="relative">
        <div
          className="rounded-[20px] bg-white p-4 shadow-[0_18px_50px_-18px_rgba(0,0,0,0.8)] [&_svg]:block [&_svg]:h-auto [&_svg]:w-full"
          role="img"
          aria-label="QR code — scan with your phone to connect"
          dangerouslySetInnerHTML={{ __html: svg }}
        />

        {connecting ? (
          <div className="anim-fade-in absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-[20px] bg-[#0a0a0c]/80 backdrop-blur-md">
            <Loader2 className="spin h-6 w-6 text-[#5ea8ff]" />
            <p className="max-w-[24ch] text-center text-[13px] font-medium leading-snug text-white/80">
              {connectingName ? `${connectingName} detected` : "Device detected"}
              <span className="mt-1 block text-[11.5px] font-normal text-white/45">
                Establishing secure link…
              </span>
            </p>
          </div>
        ) : null}
      </div>

      <div className="mt-5 flex items-center justify-between">
        {connecting ? (
          <StatusPill tone="working" ping>
            Connecting
          </StatusPill>
        ) : (
          <StatusPill tone="waiting" ping>
            Waiting for device
          </StatusPill>
        )}
        <button
          type="button"
          className="btn-icon"
          aria-label="Refresh code"
          title="Generate a new code"
          onClick={onRefresh}
        >
          <RefreshCcw className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-4">
        <div className="flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 18 18" className="-rotate-90">
            <circle cx="9" cy="9" r="7" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.6" />
            <circle
              cx="9"
              cy="9"
              r="7"
              fill="none"
              stroke={frac > 0.25 ? "#0a84ff" : "#ff6b62"}
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - frac)}
              style={{ transition: "stroke-dashoffset 1s linear, stroke 0.4s ease" }}
            />
          </svg>
          <span className="tabular text-[12px] text-white/45">
            Code expires in <span className="font-medium text-white/70">{formatCountdown(msLeft)}</span>
          </span>
        </div>
        <span className="font-mono text-[10.5px] tracking-[0.12em] text-white/40">
          {shortId(sessionId)}
        </span>
      </div>
    </div>
  );
}
