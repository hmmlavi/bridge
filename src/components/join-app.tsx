"use client";

import {
  Loader2,
  MessageSquareText,
  QrCode,
  Smartphone,
  TimerReset,
  TriangleAlert,
  Type,
  Unplug,
  Upload,
  WifiOff,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { leaveBeacon, postLeave, postSignal } from "@/lib/client";
import { detectDevice } from "@/lib/device";
import { SessionChannel } from "@/lib/events-client";
import { PeerLink, type SignalMessage } from "@/lib/rtc";
import { registerServiceWorker } from "@/lib/pwa";
import { TransferEngine, type EngineHooks } from "@/lib/transfer";
import type {
  ConnectionInfo,
  HistoryEntry,
  IncomingOffer,
  Platform,
  SharedText,
  TransferItem,
} from "@/lib/types";
import { DeviceCard } from "./DeviceCard";
import { HistoryList } from "./HistoryList";
import { IncomingCard } from "./IncomingCard";
import { LegalLinks, PrivacyNotice } from "./legal";
import { StatePage } from "./states";
import { TextSharePanel } from "./TextShare";
import { TransferList } from "./transfers";
import { BrandMark, StatusPill } from "./ui";

type Phase =
  | "boot"
  | "connecting"
  | "connected"
  | "invalid"
  | "expired"
  | "busy"
  | "failed"
  | "lost"
  | "ended"
  | "unsupported";

const TERMINAL = new Set(["completed", "failed", "canceled", "declined"]);

export default function JoinApp({ sessionId, token }: { sessionId: string; token: string }) {
  const [phase, setPhase] = useState<Phase>("boot");
  const [endReason, setEndReason] = useState<"self" | "pc">("pc");
  const [pc, setPc] = useState<{ name: string; platform: Platform } | null>(null);
  const [connInfo, setConnInfo] = useState<ConnectionInfo>({ kind: "unknown", rttMs: null });
  const [latency, setLatency] = useState<number | null>(null);
  const [items, setItems] = useState<TransferItem[]>([]);
  const [offer, setOffer] = useState<IncomingOffer | null>(null);
  const [texts, setTexts] = useState<SharedText[]>([]);
  const [showText, setShowText] = useState(false);

  const linkRef = useRef<PeerLink | null>(null);
  const engineRef = useRef<TransferEngine | null>(null);
  const channelRef = useRef<SessionChannel | null>(null);
  const kickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const joinedRef = useRef(false);
  const watchRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intentionalRef = useRef(false);
  const phaseRef = useRef<Phase>("boot");
  const nameRef = useRef("Android Phone");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  phaseRef.current = phase;

  const engineHooksRef = useRef<EngineHooks | null>(null);
  if (!engineHooksRef.current) {
    engineHooksRef.current = {
      onItemInit: (list) => setItems((prev) => [...prev, ...list]),
      onPatch: (p) =>
        setItems((prev) =>
          prev.map((it) =>
            it.fileId === p.fileId && it.transferId === p.transferId ? { ...it, ...p } : it
          )
        ),
      onIncomingOffer: (o) => setOffer(o),
      onOfferResolved: (id) => setOffer((cur) => (cur?.transferId === id ? null : cur)),
      onText: (m) => {
        setTexts((t) => [...t.slice(-49), m]);
        if (m.direction === "receive") setShowText(true);
      },
      onHello: (p) => setPc({ name: p.name, platform: p.platform }),
      onLatency: (ms) => setLatency(ms),
    };
  }

  const stopKicks = useCallback(() => {
    if (kickRef.current) clearInterval(kickRef.current);
    kickRef.current = null;
  }, []);

  const cleanupPeer = useCallback(() => {
    intentionalRef.current = true;
    linkRef.current?.close();
    linkRef.current = null;
    engineRef.current?.destroy();
    engineRef.current = null;
    stopKicks();
  }, [stopKicks]);

  const handlePcGone = useCallback(() => {
    if (intentionalRef.current) return;
    cleanupPeer();
    setOffer(null);
    setItems((prev) =>
      prev.map((it) =>
        TERMINAL.has(it.state)
          ? it
          : { ...it, state: "failed", detail: "Connection lost", completedAt: Date.now() }
      )
    );
    if (phaseRef.current === "connected" || phaseRef.current === "connecting") {
      setPhase("lost");
    }
  }, [cleanupPeer]);

  const startPeer = useCallback(() => {
    cleanupPeer();
    intentionalRef.current = false;
    const link = new PeerLink(
      {
        onSignal: (msg) => {
          void postSignal(sessionId, token, "phone", msg);
        },
        onChannelOpen: () => {
          stopKicks();
          if (watchRef.current) clearTimeout(watchRef.current);
          const engine = new TransferEngine(link, engineHooksRef.current!, {
            name: nameRef.current,
            platform: detectDevice(window.navigator.userAgent).platform,
          });
          engineRef.current = engine;
          setPhase("connected");
        },
        onChannelClose: () => {
          if (!intentionalRef.current) handlePcGone();
        },
        onMessage: (d) => engineRef.current?.handleData(d),
        onInfo: (info) => setConnInfo(info),
      },
      false
    );
    linkRef.current = link;
  }, [cleanupPeer, handlePcGone, sessionId, stopKicks, token]);

  const startKicks = useCallback(() => {
    stopKicks();
    void postSignal(sessionId, token, "phone", { type: "kick", name: nameRef.current });
    let n = 0;
    kickRef.current = setInterval(() => {
      n += 1;
      if (linkRef.current?.isOpen || n > 8) {
        stopKicks();
        return;
      }
      void postSignal(sessionId, token, "phone", { type: "kick", name: nameRef.current });
    }, 2400);
  }, [sessionId, stopKicks, token]);

  const openEvents = useCallback(() => {
    channelRef.current?.close();
    const ch = new SessionChannel({ sessionId, token, role: "phone", intervalMs: 1100 });
    channelRef.current = ch;

    ch.on("ready", () => startKicks());
    ch.on("signal", (d) => {
      const msg = d as SignalMessage;
      if (msg.type === "offer") {
        stopKicks();
        if (linkRef.current?.isOpen) return; // already connected — stray duplicate
        if (linkRef.current) {
          // Fresh negotiation — discard the stale attempt and start clean.
          cleanupPeer();
        }
        startPeer();
        void linkRef.current?.handleSignal(msg);
        return;
      }
      void linkRef.current?.handleSignal(msg);
    });
    ch.on("session-expired", () => {
      if (linkRef.current?.isOpen) return; // live P2P link outlives the pairing code
      cleanupPeer();
      setPhase("expired");
    });
    const onGone = () => {
      channelRef.current?.close();
      cleanupPeer();
      if (linkRef.current?.isOpen) return;
      if (joinedRef.current) {
        // The session existed and is now gone — the PC ended it.
        setEndReason("pc");
        setPhase("ended");
      } else {
        setPhase("invalid");
      }
    };
    ch.on("session-gone", onGone);
    ch.on("forbidden", onGone);
    ch.on("peer-offline", (d) => {
      const data = d as { role?: string };
      if (data?.role !== "pc") return;
      if (linkRef.current?.isOpen) return;
      handlePcGone();
    });
    ch.start();
  }, [cleanupPeer, handlePcGone, sessionId, startKicks, startPeer, stopKicks, token]);

  const join = useCallback(async () => {
    cleanupPeer();
    channelRef.current?.close();
    channelRef.current = null;
    joinedRef.current = false;
    setPhase("boot");
    setOffer(null);
    if (!token) {
      setPhase("invalid");
      return;
    }
    try {
      const res = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name: nameRef.current }),
      });
      if (res.status === 404) return setPhase("invalid");
      if (res.status === 410) return setPhase("expired");
      if (res.status === 409) return setPhase("busy");
      if (!res.ok) return setPhase("failed");
      const data = (await res.json()) as { pcName?: string };
      joinedRef.current = true;
      setPc({ name: data.pcName ?? "This PC", platform: "windows" });
      setPhase("connecting");
      openEvents();
      if (watchRef.current) clearTimeout(watchRef.current);
      watchRef.current = setTimeout(() => {
        if (phaseRef.current === "connecting" && !linkRef.current?.isOpen) {
          cleanupPeer();
          setPhase("failed");
        }
      }, 30_000);
    } catch {
      setPhase("failed");
    }
  }, [cleanupPeer, openEvents, sessionId, token]);

  // Boot
  useEffect(() => {
    const ident = detectDevice(window.navigator.userAgent);
    const saved = window.localStorage.getItem("bridge:phoneName");
    nameRef.current = saved ?? ident.name;
    if (!saved) window.localStorage.setItem("bridge:phoneName", ident.name);
    registerServiceWorker();

    if (typeof window.RTCPeerConnection === "undefined") {
      setPhase("unsupported");
      return;
    }

    const onUnload = () => leaveBeacon(sessionId, token, "phone");
    window.addEventListener("beforeunload", onUnload);
    void join();

    return () => {
      window.removeEventListener("beforeunload", onUnload);
      channelRef.current?.close();
      cleanupPeer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Adaptive polling: quick while pairing, quiet once the P2P link carries traffic.
  useEffect(() => {
    channelRef.current?.setIntervalMs(phase === "connected" ? 5000 : 1100);
  }, [phase]);

  const disconnect = useCallback(async () => {
    intentionalRef.current = true;
    setEndReason("self");
    channelRef.current?.close();
    channelRef.current = null;
    cleanupPeer();
    void postLeave(sessionId, token, "phone");
    setPhase("ended");
  }, [cleanupPeer, sessionId, token]);

  // Keyboard: Escape closes the text sheet.
  useEffect(() => {
    if (!showText) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowText(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showText]);

  const historyEntries = useMemo<HistoryEntry[]>(() => {
    const peerName = pc?.name ?? "PC";
    const files = items
      .filter((i) => TERMINAL.has(i.state))
      .map((i) => ({
        id: i.fileId,
        kind: "file" as const,
        label: i.name,
        size: i.size,
        direction: i.direction,
        peerName: i.peerName ?? peerName,
        at: i.completedAt ?? 0,
        status: i.state as HistoryEntry["status"],
      }));
    const txts = texts.map((t) => ({
      id: t.id,
      kind: "text" as const,
      label: t.text.length > 64 ? `${t.text.slice(0, 64)}…` : t.text,
      size: null,
      direction: t.direction,
      peerName: t.direction === "send" ? peerName : t.from,
      at: t.at,
      status: (t.direction === "send" ? "sent" : "received") as HistoryEntry["status"],
    }));
    return [...files, ...txts].filter((e) => e.at > 0).sort((a, b) => b.at - a.at).slice(0, 9);
  }, [items, texts, pc]);

  /* ------------------------------ state pages ------------------------------ */

  if (phase !== "connected") {
    return (
      <div className="min-h-dvh">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-[13px] focus:font-semibold focus:text-black"
        >
          Skip to content
        </a>
        <header className="border-b border-white/[0.05]">
          <div className="mx-auto flex w-full max-w-lg items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-3">
              <BrandMark size={34} />
              <p className="text-[15px] font-semibold tracking-tight text-white">Bridge</p>
            </div>
            {phase === "connecting" ? (
              <StatusPill tone="working" ping>
                Connecting
              </StatusPill>
            ) : null}
          </div>
        </header>

        {phase === "boot" ? (
          <StatePage
            icon={<Loader2 className="spin h-6 w-6" />}
            title="Joining session"
            body="Checking this pairing code and knocking on your PC's door…"
          />
        ) : null}

        {phase === "connecting" && pc ? (
          <StatePage
            tone="accent"
            icon={<Loader2 className="spin h-6 w-6" />}
            title={`Connecting to ${pc.name}`}
            body="Negotiating a direct, encrypted peer-to-peer link. Keep this page open for a few seconds."
          />
        ) : null}

        {phase === "unsupported" ? (
          <StatePage
            tone="red"
            icon={<TriangleAlert className="h-6 w-6" />}
            title="This browser can't connect directly"
            body="Bridge transfers files with WebRTC, which needs Chrome for Android on the secure (HTTPS) link you scanned. Open it there and try again."
            actions={
              <button type="button" className="btn btn-primary" onClick={() => void join()}>
                Try again
              </button>
            }
          />
        ) : null}

        {phase === "invalid" ? (
          <StatePage
            tone="red"
            icon={<QrCode className="h-6 w-6" />}
            title="This code is no longer valid"
            body="The pairing session it belongs to has ended. Ask for a new code on your PC and scan it with your camera."
          />
        ) : null}

        {phase === "expired" ? (
          <StatePage
            tone="red"
            icon={<TimerReset className="h-6 w-6" />}
            title="Code expired"
            body="Pairing codes only stay valid for a few minutes to keep your files private. A fresh code is ready on your PC — scan it to connect."
          />
        ) : null}

        {phase === "busy" ? (
          <StatePage
            tone="red"
            icon={<Smartphone className="h-6 w-6" />}
            title="Another phone is connected"
            body="This PC session is already paired with a different device. End that session on the PC or use its new code."
          />
        ) : null}

        {phase === "failed" ? (
          <StatePage
            tone="red"
            icon={<TriangleAlert className="h-6 w-6" />}
            title="Couldn't reach this PC"
            body="Check that you're online and both devices are on the same Wi‑Fi network, then try again."
            actions={
              <button type="button" className="btn btn-primary" onClick={() => void join()}>
                Try again
              </button>
            }
          />
        ) : null}

        {phase === "lost" ? (
          <StatePage
            tone="red"
            icon={<WifiOff className="h-6 w-6" />}
            title="Connection lost"
            body="The link to your PC dropped. Reconnect to pick up where you left off — the session itself is still alive."
            actions={
              <button type="button" className="btn btn-primary" onClick={() => void join()}>
                Reconnect
              </button>
            }
          />
        ) : null}

        {phase !== "boot" ? (
          <footer className="fixed inset-x-0 bottom-0 z-10 pb-[max(1rem,env(safe-area-inset-bottom))] pt-6">
            <LegalLinks />
          </footer>
        ) : null}

        {phase === "ended" ? (
          <StatePage
            icon={<Unplug className="h-6 w-6" />}
            title={endReason === "self" ? "Disconnected" : "Session ended"}
            body={
              endReason === "self"
                ? "You disconnected from the PC. Reconnect any time — or scan a new code if the session was closed."
                : "The PC ended this session and its code is no longer valid. Scan the new code shown on the PC to continue."
            }
            actions={
              endReason === "self" ? (
                <button type="button" className="btn btn-primary" onClick={() => void join()}>
                  Reconnect
                </button>
              ) : undefined
            }
          />
        ) : null}

        <PrivacyNotice />
      </div>
    );
  }

  /* ----------------------------- connected view ---------------------------- */

  return (
    <div className="min-h-dvh pb-[max(2rem,env(safe-area-inset-bottom))]">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          const files = e.target.files ? Array.from(e.target.files) : [];
          if (files.length) engineRef.current?.sendFiles(files);
          e.target.value = "";
        }}
      />
      <input
        ref={photoInputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        hidden
        onChange={(e) => {
          const files = e.target.files ? Array.from(e.target.files) : [];
          if (files.length) engineRef.current?.sendFiles(files);
          e.target.value = "";
        }}
      />

      <header className="sticky top-0 z-20 border-b border-white/[0.05] bg-[#08080a]/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-lg items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <BrandMark size={32} />
            <p className="text-[14.5px] font-semibold tracking-tight text-white">Bridge</p>
          </div>
          <button
            type="button"
            className="btn-icon text-white/45 hover:text-[#ff8a80]"
            aria-label="Disconnect from PC"
            onClick={() => void disconnect()}
          >
            <Unplug className="h-[17px] w-[17px]" />
          </button>
        </div>
      </header>

      <div id="main-content" className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 pt-5">
        {pc ? (
          <DeviceCard
            name={pc.name}
            platform={pc.platform}
            info={connInfo}
            latency={latency}
            onDisconnect={() => void disconnect()}
            compact
          />
        ) : null}

        <div className="stagger grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="glass hover-lift flex min-h-[104px] flex-col items-center justify-center gap-2.5 rounded-[22px] p-4"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-black">
              <Upload className="h-5 w-5" strokeWidth={2.2} />
            </span>
            <span className="text-[13.5px] font-semibold tracking-tight text-white">Send files</span>
          </button>
          <button
            type="button"
            onClick={() => setShowText(true)}
            className="glass hover-lift flex min-h-[104px] flex-col items-center justify-center gap-2.5 rounded-[22px] p-4"
          >
            <span className="glass-2 flex h-11 w-11 items-center justify-center rounded-full text-white/85">
              <Type className="h-5 w-5" />
            </span>
            <span className="text-[13.5px] font-semibold tracking-tight text-white">Text or link</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => photoInputRef.current?.click()}
          className="anim-fade-up -mt-1 text-[12px] font-medium text-white/40 transition-colors hover:text-white/70"
          style={{ animationDelay: "120ms" }}
        >
          or choose photos &amp; videos
        </button>

        {offer ? (
          <IncomingCard
            offer={offer}
            onAccept={(id) => engineRef.current?.acceptOffer(id)}
            onDecline={(id) => engineRef.current?.declineOffer(id)}
          />
        ) : null}

        <TransferList
          items={items}
          onCancel={(id) => engineRef.current?.cancelTransfer(id)}
          onClearFinished={() => setItems((prev) => prev.filter((i) => !TERMINAL.has(i.state)))}
          emptyHint="Files you send or receive will appear here with live progress."
        />

        <div className={texts.length || items.length ? "" : ""}>
          <HistoryList entries={historyEntries} />
        </div>

        <p className="mt-2 text-center text-[11px] leading-relaxed text-white/40">
          Direct device-to-device transfer · keep this page open while transferring
        </p>
        <LegalLinks className="pb-4" />
      </div>

      {/* text sheet */}
      {showText ? (
        <div className="fixed inset-0 z-40">
          <div
            className="anim-fade-in absolute inset-0 bg-black/60 backdrop-blur-[6px]"
            onClick={() => setShowText(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Text and links"
            className="anim-sheet absolute inset-x-0 bottom-0 max-h-[86dvh] overflow-hidden rounded-t-[26px] border-t border-x border-white/10 bg-[#0e0e12]/95 p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] backdrop-blur-2xl sm:inset-x-6 sm:bottom-6 sm:rounded-[26px] sm:border-b"
          >
            <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-white/15" />
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[14px] font-semibold tracking-tight text-white">
                <MessageSquareText className="h-4 w-4 text-white/50" />
                Text &amp; links
              </div>
              <button
                type="button"
                className="btn-icon h-8 w-8"
                aria-label="Close"
                onClick={() => setShowText(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="scroll-area max-h-[62dvh] overflow-y-auto">
              <TextSharePanel
                texts={texts}
                onSend={(t) => engineRef.current?.sendText(t)}
                placeholder="Type or paste something…"
                sendLabel={`Send to ${pc?.name ?? "PC"}`}
              />
            </div>
          </div>
        </div>
      ) : null}

      <PrivacyNotice />
    </div>
  );
}
