import { Waypoints } from "lucide-react";
import type { ReactNode } from "react";

export function BrandMark({ size = 38 }: { size?: number }) {
  return (
    <span
      className="glass-2 inline-flex items-center justify-center rounded-[13px]"
      style={{ width: size, height: size }}
    >
      <Waypoints size={size * 0.52} strokeWidth={1.8} className="text-white/90" />
    </span>
  );
}

export type PillTone = "connected" | "waiting" | "working" | "error";

export function StatusPill({
  tone,
  children,
  ping = false,
}: {
  tone: PillTone;
  children: ReactNode;
  ping?: boolean;
}) {
  const cls =
    tone === "connected"
      ? "pill-connected"
      : tone === "working"
        ? "pill-working"
        : tone === "error"
          ? "pill-error"
          : "pill-waiting";
  return (
    <span className={`pill ${cls}`}>
      <span className={`dot ${tone === "connected" ? "dot-breathe" : ""} ${ping ? "dot-ping" : ""}`} />
      {children}
    </span>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">
      {children}
    </p>
  );
}

export function IconTile({
  children,
  size = 44,
  tone = "neutral",
}: {
  children: ReactNode;
  size?: number;
  tone?: "neutral" | "accent" | "green" | "red";
}) {
  const tones: Record<string, string> = {
    neutral: "bg-white/[0.07] border-white/10 text-white/80",
    accent: "bg-[rgba(10,132,255,0.14)] border-[rgba(10,132,255,0.3)] text-[#5ea8ff]",
    green: "bg-[rgba(48,209,88,0.10)] border-[rgba(48,209,88,0.3)] text-[#4ade80]",
    red: "bg-[rgba(255,107,98,0.10)] border-[rgba(255,107,98,0.28)] text-[#ff8a80]",
  };
  return (
    <span
      className={`inline-flex flex-none items-center justify-center rounded-[14px] border ${tones[tone]}`}
      style={{ width: size, height: size }}
    >
      {children}
    </span>
  );
}

export function EmptyState({ icon, title, hint }: { icon: ReactNode; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2.5 rounded-2xl border border-dashed border-white/10 px-6 py-10 text-center">
      <span className="text-white/35" aria-hidden>{icon}</span>
      <p className="text-[13px] font-medium text-white/50">{title}</p>
      {hint ? <p className="max-w-[32ch] text-xs leading-relaxed text-white/45">{hint}</p> : null}
    </div>
  );
}
