"use client";

import { ArrowLeft, Cookie, FileText, ShieldCheck, TicketPercent } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { LEGAL } from "@/lib/legal-meta";
import { BrandMark } from "./ui";

export function LegalLinks({ className = "" }: { className?: string }) {
  const link = "transition-colors hover:text-white/70";
  return (
    <nav aria-label="Legal" className={`flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11.5px] text-white/40 ${className}`}>
      <Link href="/privacy" className={link}>Privacy</Link>
      <span aria-hidden className="text-white/15">·</span>
      <Link href="/terms" className={link}>Terms</Link>
      <span aria-hidden className="text-white/15">·</span>
      <Link href="/cookies" className={link}>Cookies</Link>
      <span aria-hidden className="text-white/15">·</span>
      <Link href="/refund" className={link}>Refunds</Link>
    </nav>
  );
}

/**
 * One-time local privacy acknowledgment.
 *
 * This is intentionally NOT a cookie-consent banner: the app sets no cookies
 * and runs no trackers, so ePrivacy cookie consent is not triggered. It is a
 * transparency notice for the strictly-necessary local storage the app does use,
 * and it never collects anything when dismissed.
 */
export function PrivacyNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Defer the storage check so no state update runs synchronously in the effect.
    const t = setTimeout(() => {
      try {
        if (!window.localStorage.getItem("bridge:privacy-ack")) setVisible(true);
      } catch {
        /* storage unavailable — do not nag */
      }
    }, 0);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Privacy notice"
      className="anim-sheet fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-50 mx-auto max-w-md sm:inset-x-auto sm:right-5 sm:bottom-5 sm:mx-0 sm:w-[380px]"
    >
      <div className="glass rounded-[20px] p-4">
        <div className="flex items-start gap-3">
          <span className="glass-2 mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-[10px] text-white/70">
            <ShieldCheck className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold tracking-tight text-white">Private by design</p>
            <p className="mt-1 text-[12px] leading-relaxed text-white/55">
              Bridge sets no cookies and runs no analytics. It stores only your display name,
              on this device, and transfers files directly between your devices.
            </p>
            <div className="mt-2.5 flex items-center gap-3">
              <button
                type="button"
                className="btn btn-primary h-8 px-4 text-[12.5px]"
                onClick={() => {
                  try {
                    window.localStorage.setItem("bridge:privacy-ack", "1");
                  } catch {
                    /* ignore */
                  }
                  setVisible(false);
                }}
              >
                Got it
              </button>
              <Link
                href="/privacy"
                className="text-[12px] font-medium text-[#5ea8ff] transition-colors hover:text-[#84bcff]"
              >
                Privacy policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ legal pages ------------------------------ */

export function LegalShell({
  title,
  icon,
  intro,
  updated,
  children,
}: {
  title: string;
  icon: ReactNode;
  intro: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-white/[0.05] bg-[#08080a]/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-5 py-3.5">
          <Link href="/" className="flex items-center gap-3" aria-label="Bridge — back to app">
            <BrandMark size={34} />
            <span className="text-[15px] font-semibold tracking-tight text-white">Bridge</span>
          </Link>
          <Link
            href="/"
            className="btn btn-glass h-9 px-3.5 text-[12.5px]"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Back to app
          </Link>
        </div>
      </header>

      <main id="main-content" className="mx-auto w-full max-w-3xl px-5 pb-20 pt-10">
        <div className="glass-2 anim-fade-up mb-8 flex items-start gap-4 rounded-[22px] p-5 sm:p-6">
          <span className="glass-2 flex h-11 w-11 flex-none items-center justify-center rounded-[13px] text-white/75">
            {icon}
          </span>
          <div>
            <h1 className="text-[24px] font-semibold tracking-tight text-white">{title}</h1>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-white/55">{intro}</p>
            <p className="mt-2 text-[11.5px] text-white/40">Last updated: {updated}</p>
          </div>
        </div>

        <article className="anim-fade-up" style={{ animationDelay: "60ms" }}>
          {children}
        </article>

        <div className="mt-14 border-t border-white/[0.06] pt-6">
          <LegalLinks />
        </div>
      </main>
    </div>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-8">
      <h2 className="mb-2.5 text-[16.5px] font-semibold tracking-tight text-white/90">{title}</h2>
      <div className="space-y-2.5 text-[13.5px] leading-relaxed text-white/60 [&_strong]:font-semibold [&_strong]:text-white/85">
        {children}
      </div>
    </section>
  );
}

export function BusinessDetails({ includeGrievance = false }: { includeGrievance?: boolean }) {
  return (
    <address className="glass-flat not-italic rounded-[14px] p-4 text-[13px] leading-relaxed">
      <p className="font-semibold text-white/80">{LEGAL.operatorName}</p>
      <p className="mt-1 text-white/55">{LEGAL.operatorAddress}</p>
      <p className="mt-1 text-white/55">
        Contact: <span className="text-[#5ea8ff]">{LEGAL.contactEmail}</span>
      </p>
      {includeGrievance ? (
        <p className="mt-2 border-t border-white/[0.06] pt-2 text-white/55">
          Grievance officer (India, DPDP Act 2023): {LEGAL.grievanceOfficerName} ·{" "}
          <span className="text-[#5ea8ff]">{LEGAL.grievanceOfficerEmail}</span> — complaints are
          acknowledged and answered within {LEGAL.grievanceResponseDays} days.
        </p>
      ) : null}
      <p className="mt-2 text-[11.5px] text-white/35">
        Bracketed fields must be replaced with the operator&apos;s real details before this site is
        published.
      </p>
    </address>
  );
}

export const legalIcons = {
  privacy: <ShieldCheck className="h-5 w-5" aria-hidden />,
  terms: <FileText className="h-5 w-5" aria-hidden />,
  cookies: <Cookie className="h-5 w-5" aria-hidden />,
  refund: <TicketPercent className="h-5 w-5" aria-hidden />,
};

export function DataTable({ rows }: { rows: Array<[string, string, string]> }) {
  return (
    <div className="glass-flat overflow-x-auto rounded-[14px]">
      <table className="w-full min-w-[480px] text-left text-[12.5px]">
        <thead>
          <tr className="border-b border-white/[0.07] text-white/45">
            <th scope="col" className="px-4 py-2.5 font-semibold">Item</th>
            <th scope="col" className="px-4 py-2.5 font-semibold">Purpose</th>
            <th scope="col" className="px-4 py-2.5 font-semibold">Retention</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.05]">
          {rows.map(([a, b, c]) => (
            <tr key={a}>
              <td className="px-4 py-2.5 font-mono text-[11.5px] text-white/75">{a}</td>
              <td className="px-4 py-2.5 text-white/55">{b}</td>
              <td className="px-4 py-2.5 text-white/55">{c}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
