"use client";

import type { ReactNode } from "react";
import { IconTile } from "./ui";

export function StatePage({
  icon,
  tone = "neutral",
  title,
  body,
  actions,
  footer,
}: {
  icon: ReactNode;
  tone?: "neutral" | "accent" | "green" | "red";
  title: string;
  body: string;
  actions?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-96px)] w-full max-w-md items-center justify-center px-5 py-10">
      <div className="glass anim-fade-up w-full rounded-[28px] p-8 text-center sm:p-10">
        <div className="mb-5 flex justify-center">
          <IconTile size={56} tone={tone}>
            {icon}
          </IconTile>
        </div>
        <h1 className="text-balance text-[22px] font-semibold tracking-tight text-white">
          {title}
        </h1>
        <p className="mx-auto mt-2.5 max-w-[38ch] text-pretty text-sm leading-relaxed text-white/50">
          {body}
        </p>
        {actions ? <div className="mt-7 flex flex-wrap items-center justify-center gap-3">{actions}</div> : null}
        {footer ? <div className="mt-6 text-xs text-white/30">{footer}</div> : null}
      </div>
    </div>
  );
}
