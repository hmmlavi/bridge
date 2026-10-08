"use client";

import {
  ArrowDownToLine,
  Camera,
  CloudOff,
  FileUp,
  Loader2,
  Pencil,
  ScanLine,
  Send,
  ShieldCheck,
  TimerReset,
  TriangleAlert,
  Type,
  Unplug,
  WifiOff,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { deleteSession, leaveBeacon, postLeave, postSignal } from "@/lib/client";
import { detectDevice, type DeviceIdentity } from "@/lib/device";
import { SessionChannel } from "@/lib/events-client";
import { shortId } from "@/lib/format";
import { PeerLink } from "@/lib/rtc";
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
import { QrCard } from "./QrCard";
import { StatePage } from "./states";
import { TextSharePanel } from "./TextShare";
import { TransferList } from "./transfers";
import { BrandMark, IconTile, StatusPill } from "./ui";

type Phase =
  | "boot"
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "failed"
  | "ended"
  | "unsupported";

interface SessionInfo {
  id: string;
  token: string;
  expiresAt: number;
}

const TERMINAL = new Set(["completed", "failed", "canceled", "declined"]);
const PAIRING_WINDOW = 4 * 60 * 1000;

export default function PcApp() {
  const [phase, setPhase] = useState<Phase>("boot");
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [qrUrl, setQrUrl] = useState("");
  const [pcName, setPcName] = useState("This PC");
  const [peer, setPeer] = useState<{ name: string; platform: Platform } | null>(null);
  const [connInfo, setConnInfo] = useState<ConnectionInfo>({ kind: "unknown", rttMs: null });
  const [latency, setLatency] = useState<number | null>(null);
  const [items, setItems] = useState<TransferItem[]>([]);
  const [offer, setOffer] = useState<IncomingOffer | null>(null);
  const [texts, setTexts] = useState<SharedText[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [dragOver, setDragOver] = useState(false);
  const [showText, setShowText] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");

  const sessionRef = useRef<SessionInfo | null>(null);
  const linkRef = useRef<PeerLink | null>(null);
  const engineRef = useRef<TransferEngine | null>(null);
  const channelRef = useRef<SessionChannel | null>(null);
  const intentionalRef = useRef(false);
  const phaseRef = useRef<Phase>("boot");
  const pcNameRef = useRef("This PC");
  const identRef = useRef<DeviceIdentity | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const connectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const offerSentAtRef = useRef(0);

  phaseRef.current = phase;
  pcNameRef.current = pcName;

  if (!identRef.current && typeof window !== "undefined") {
    identRef.current = detectDevice(window.navigator.userAgent);
  }

  const showNotice = useCallback((text: string) => {
    setNotice(text);
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = setTimeout(() => setNotice(null), 4200);
  }, []);

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
      onHello: (p) => setPeer({ name: p.name, platform: p.platform }),
      onLatency: (ms) => setLatency(ms),
    };
  }

  const cleanupPeer = useCallback(() => {
    intentionalRef.current = true;
    if (connectTimerRef.current) clearTimeout(connectTimerRef.current);
    linkRef.current?.close();
    linkRef.current = null;
    engineRef.current?.destroy();
    engineRef.current = null;
  }, []);

  const handlePhoneGone = useCallback(
    (reason: string) => {
      if (intentionalRef.current) return;
      cleanupPeer();
      setPeer(null);
      setOffer(null);
      setLatency(null);
      setItems((prev) =>
        prev.map((it) =>
          TERMINAL.has(it.state)
            ? it
            : { ...it, state: "failed", detail: "Connection lost", completedAt: Date.now() }
        )
      );
      const p = phaseRef.current;
      if (p === "connected" || p === "connecting") {
        setPhase("disconnected");
        showNotice(reason);
      }
    },
    [cleanupPeer, showNotice]
  );

  const startPeer = useCallback(
    (initiator: boolean) => {
      if (typeof window === "undefined" || typeof window.RTCPeerConnection === "undefined") {
        setPhase("unsupported");
        return;
      }
      cleanupPeer();
      intentionalRef.current = false;
      const link = new PeerLink(
        {
          onSignal: (msg) => {
            const s = sessionRef.current;
            if (s) void postSignal(s.id, s.token, "pc", msg);
          },
          onChannelOpen: () => {
            if (connectTimerRef.current) clearTimeout(connectTimerRef.current);
            const engine = new TransferEngine(link, engineHooksRef.current!, {
              name: pcNameRef.current,
              platform: identRef.current?.platform ?? "windows",
            });
            engineRef.current = engine;
            setPhase("connected");
          },
          onChannelClose: () => {
            if (!intentionalRef.current) {
              handlePhoneGone("The connection to your phone closed.");
            }
          },
          onMessage: (d) => engineRef.current?.handleData(d),
          onInfo: (info) => setConnInfo(info),
        },
        initiator
      );
      linkRef.current = link;
      if (initiator) {
        offerSentAtRef.current = Date.now();
        void link.makeOffer();
      }
      if (connectTimerRef.current) clearTimeout(connectTimerRef.current);
      connectTimerRef.current = setTimeout(() => {
        if (phaseRef.current === "connecting") {
          cleanupPeer();
          setPeer(null);
          setPhase("idle");
          showNotice("Couldn't establish a direct link. Ask the phone to scan again.");
        }
      }, 25000);
    },
    [cleanupPeer, handlePhoneGone, showNotice]
  );

  const openEvents = useCallback(
    (id: string, token: string) => {
      channelRef.current?.close();
      const ch = new SessionChannel({ sessionId: id, token, role: "pc", intervalMs: 1100 });
      channelRef.current = ch;

      ch.on("ready", (d) => {
        // Recover the "a phone is already here" state after any reconnect.
        const data = d as { joined?: boolean; phoneName?: string | null };
        if (data?.joined && phaseRef.current === "idle") {
          setPeer({ name: data.phoneName ?? "Android Phone", platform: "android" });
          setPhase("connecting");
        }
      });
      ch.on("phone-joined", (d) => {
        const data = d as { name?: string };
        setPeer({ name: data?.name ?? "Android Phone", platform: "android" });
        setPhase("connecting");
        // The PC stays passive here — the phone announces readiness with a kick
        // *after* its own event channel is live, so offers are never lost.
      });
      ch.on("signal", (d) => {
        const msg = d as { type: string; name?: string };
        if (msg.type === "kick") {
          // The phone is listening and wants an offer.
          const live = linkRef.current;
          if (live?.isOpen) return; // already connected
          if (live) {
            const st = live.connectionState;
            const fresh = Date.now() - offerSentAtRef.current < 20_000;
            if ((st === "new" || st === "connecting" || st === "connected") && fresh) return;
          }
          setPeer({ name: msg.name ?? "Android Phone", platform: "android" });
          setPhase("connecting");
          startPeer(true);
          return;
        }
        void linkRef.current?.handleSignal(msg as Parameters<PeerLink["handleSignal"]>[0]);
      });
      ch.on("phone-left", () => handlePhoneGone("Your phone disconnected from this session."));
      ch.on("peer-offline", (d) => {
        const data = d as { role?: string };
        if (data?.role !== "phone") return;
        if (linkRef.current?.isOpen) return; // P2P transport still alive
        handlePhoneGone("The connection to your phone was interrupted.");
      });
      const onSessionEnd = () => {
        channelRef.current?.close();
        channelRef.current = null;
        if (phaseRef.current === "connected" || linkRef.current?.isOpen) return; // P2P link outlives pairing
        cleanupPeer();
        sessionRef.current = null;
        void createSessionRef.current?.(true);
        showNotice("Code expired — a fresh one is ready.");
      };
      ch.on("session-expired", onSessionEnd);
      ch.on("session-gone", onSessionEnd);
      ch.on("forbidden", onSessionEnd);
      ch.start();
    },
    [cleanupPeer, handlePhoneGone, showNotice, startPeer]
  );

  const createSession = useCallback(
    async (reset: boolean) => {
      channelRef.current?.close();
      channelRef.current = null;
      cleanupPeer();
      setOffer(null);
      if (reset) {
        setItems([]);
        setTexts([]);
        setPeer(null);
        setLatency(null);
        setConnInfo({ kind: "unknown", rttMs: null });
      }
      setPhase("boot");
      try {
        const res = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: pcNameRef.current }),
        });
        if (!res.ok) throw new Error("create failed");
        const data = (await res.json()) as { id: string; token: string; expiresAt: number };
        const info: SessionInfo = { id: data.id, token: data.token, expiresAt: data.expiresAt };
        sessionRef.current = info;
        setSession(info);
        setQrUrl(`${window.location.origin}/join/${data.id}?k=${encodeURIComponent(data.token)}`);
        setPhase("idle");
        openEvents(data.id, data.token);
      } catch {
        setPhase("failed");
      }
    },
    [cleanupPeer, openEvents]
  );

  const createSessionRef = useRef<((reset: boolean) => Promise<void>) | null>(null);
  createSessionRef.current = createSession;

  // Boot: restore name, create session, register PWA, wire unload beacon.
  useEffect(() => {
    const saved = window.localStorage.getItem("bridge:name");
    if (saved) setPcName(saved);
    else if (identRef.current) setPcName(identRef.current.name);
    registerServiceWorker();

    if (typeof window.RTCPeerConnection === "undefined") {
      setPhase("unsupported");
      return;
    }

    const onUnload = () => {
      const s = sessionRef.current;
      if (s) leaveBeacon(s.id, s.token, "pc");
    };
    window.addEventListener("beforeunload", onUnload);
    void createSession(true);

    return () => {
      window.removeEventListener("beforeunload", onUnload);
      channelRef.current?.close();
      cleanupPeer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Countdown ticker + auto-refresh of expired pairing codes.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Adaptive polling: lively while pairing, quiet once the P2P link carries everything.
  useEffect(() => {
    channelRef.current?.setIntervalMs(phase === "connected" ? 5000 : 1100);
  }, [phase]);

  useEffect(() => {
    if (phase !== "idle" || !session) return;
    if (session.expiresAt - now <= 0) {
      showNotice("Code expired — generating a fresh one…");
      void createSession(true);
    }
  }, [now, phase, session, createSession, showNotice]);

  // Whole-window drag & drop.
  useEffect(() => {
    if (phase !== "connected") {
      setDragOver(false);
      return;
    }
    let depth = 0;
    const hasFiles = (e: DragEvent) =>
      Array.from(e.dataTransfer?.types ?? ([] as string[])).includes("Files");
    const onEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth += 1;
      setDragOver(true);
    };
    const onOver = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
    };
    const onLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDragOver(false);
    };
    const onDrop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setDragOver(false);
      const files = Array.from(e.dataTransfer?.files ?? []);
      if (files.length > 0) engineRef.current?.sendFiles(files);
    };
    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragover", onOver);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, [phase]);

  const pickFiles = useCallback(() => fileInputRef.current?.click(), []);

  const onFilesPicked = useCallback((list: FileList | null) => {
    const files = list ? Array.from(list) : [];
    if (files.length > 0) engineRef.current?.sendFiles(files);
  }, []);

  const endSession = useCallback(async () => {
    const s = sessionRef.current;
    intentionalRef.current = true;
    channelRef.current?.close();
    channelRef.current = null;
    cleanupPeer();
    sessionRef.current = null;
    if (s) void deleteSession(s.id, s.token);
    setSession(null);
    setPeer(null);
    setOffer(null);
    setPhase("ended");
  }, [cleanupPeer]);

  const restartWithNewCode = useCallback(async () => {
    const s = sessionRef.current;
    if (s) void postLeave(s.id, s.token, "pc");
    await createSession(true);
  }, [createSession]);

  const saveName = useCallback(() => {
    const n = nameDraft.trim().slice(0, 40);
    if (n) {
      setPcName(n);
      window.localStorage.setItem("bridge:name", n);
      engineRef.current?.renameOwn(n);
    }
    setEditingName(false);
  }, [nameDraft]);

  const historyEntries = useMemo<HistoryEntry[]>(() => {
    const peerName = peer?.name ?? "device";
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
  }, [items, texts, peer]);

  const msLeft = session ? Math.max(0, session.expiresAt - now) : 0;

  return (
    <div className="min-h-dvh">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-[13px] focus:font-semibold focus:text-black"
      >
        Skip to content
      </a>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          onFilesPicked(e.target.files);
          e.target.value = "";
        }}
      />

      <header className="sticky top-0 z-20 border-b border-white/[0.05] bg-[#08080a]/75 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <BrandMark />
            <div>
              <p className="text-[15px] font-semibold tracking-tight text-white">Bridge</p>
              <p className="-mt-0.5 text-[10.5px] font-medium tracking-wide text-white/35">
                Direct transfer
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5" aria-live="polite">
            {phase === "connected" && peer ? (
              <StatusPill tone="connected">Connected · {peer.name}</StatusPill>
            ) : null}
            {phase === "idle" && session ? (
              <span className="hidden font-mono text-[10.5px] tracking-[0.14em] text-white/30 sm:block">
                SESSION {shortId(session.id)}
              </span>
            ) : null}
            {phase === "connecting" ? (
              <StatusPill tone="working" ping>
                Establishing link
              </StatusPill>
            ) : null}
          </div>
        </div>
      </header>

      {/* ------------------------------ states ------------------------------ */}

      {phase === "boot" ? (
        <StatePage
          icon={<Loader2 className="spin h-6 w-6" />}
          title="Preparing a secure session"
          body="Creating a one-time pairing code for this PC. No account needed."
        />
      ) : null}

      {phase === "failed" ? (
        <StatePage
          tone="red"
          icon={<TriangleAlert className="h-6 w-6" />}
          title="Couldn't create a session"
          body="Please check your internet connection and try again. Bridge needs a network to pair your devices — your files still never leave your local network."
          actions={
            <button type="button" className="btn btn-primary" onClick={() => void createSession(true)}>
              Try again
            </button>
          }
        />
      ) : null}

      {phase === "unsupported" ? (
        <StatePage
          tone="red"
          icon={<TriangleAlert className="h-6 w-6" />}
          title="Direct transfer isn't available here"
          body="Bridge moves files straight between devices with WebRTC, which requires Chrome or Edge on a secure (HTTPS or localhost) page. Open Bridge in a supported browser and try again."
        />
      ) : null}

      {phase === "ended" ? (
        <StatePage
          icon={<Unplug className="h-6 w-6" />}
          title="Session ended"
          body="This pairing session and its code are no longer valid. Start a new session whenever you're ready."
          actions={
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void createSession(true)}
            >
              Start new session
            </button>
          }
        />
      ) : null}

      {phase === "disconnected" ? (
        <StatePage
          tone="red"
          icon={<WifiOff className="h-6 w-6" />}
          title="Phone disconnected"
          body={`${peer?.name ?? "Your phone"} is no longer connected. Make sure both devices stay on the same Wi‑Fi network, then reconnect.`}
          actions={
            <>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void restartWithNewCode()}
              >
                Show new code
              </button>
              <button
                type="button"
                className="btn btn-glass"
                onClick={() => setPhase("idle")}
              >
                Wait for rejoin
              </button>
            </>
          }
        />
      ) : null}

      {/* --------------------------- pairing screen -------------------------- */}

      {phase === "idle" || phase === "connecting" ? (
        <div id="main-content" className="mx-auto grid w-full max-w-5xl gap-12 px-5 pb-20 pt-10 sm:pt-14 lg:grid-cols-[1.05fr_auto] lg:items-center lg:pt-20">
          <div>
            <div className="anim-fade-up">
              <StatusPill tone="working">Secure session ready</StatusPill>
            </div>
            <h1
              className="anim-fade-up mt-5 text-balance text-[38px] font-semibold leading-[1.04] tracking-[-0.025em] text-white sm:text-[52px]"
              style={{ animationDelay: "40ms" }}
            >
              Connect your phone
            </h1>
            <p
              className="anim-fade-up mt-4 max-w-[46ch] text-pretty text-[15px] leading-relaxed text-white/50"
              style={{ animationDelay: "90ms" }}
            >
              Point your Android camera at the code to pair instantly. Files then move
              directly between your devices — encrypted, with nothing uploaded to the cloud.
            </p>

            <div className="stagger mt-9 flex max-w-md flex-col gap-2.5">
              {[
                { icon: <Camera className="h-4 w-4" />, title: "Open your camera", body: "Any QR scanner works too." },
                { icon: <ScanLine className="h-4 w-4" />, title: "Scan the code", body: "Your phone joins this private session." },
                { icon: <Send className="h-4 w-4" />, title: "Start sending", body: "Files, photos, documents, text and links." },
              ].map((s, i) => (
                <div key={s.title} className="glass-flat hover-lift flex items-center gap-4 rounded-[18px] px-4 py-3.5">
                  <span className="glass-2 flex h-9 w-9 flex-none items-center justify-center rounded-[11px] text-white/70">
                    {s.icon}
                  </span>
                  <div>
                    <p className="text-[13.5px] font-medium text-white/85">
                      <span className="mr-2 font-mono text-[10.5px] text-white/30">0{i + 1}</span>
                      {s.title}
                    </p>
                    <p className="mt-0.5 text-[12px] text-white/40">{s.body}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="anim-fade-up mt-8 flex flex-wrap gap-2" style={{ animationDelay: "260ms" }}>
              {[
                { icon: <ShieldCheck className="h-3.5 w-3.5" />, label: "Encrypted direct transfer" },
                { icon: <CloudOff className="h-3.5 w-3.5" />, label: "No cloud storage" },
                { icon: <TimerReset className="h-3.5 w-3.5" />, label: "Self-expiring code" },
              ].map((b) => (
                <span
                  key={b.label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 text-[11.5px] font-medium text-white/45"
                >
                  <span className="text-white/55">{b.icon}</span>
                  {b.label}
                </span>
              ))}
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            {session ? (
              <QrCard
                value={qrUrl}
                sessionId={session.id}
                msLeft={msLeft}
                totalMs={PAIRING_WINDOW}
                connecting={phase === "connecting"}
                connectingName={peer?.name}
                onRefresh={() => void restartWithNewCode()}
              />
            ) : null}
          </div>
        </div>
      ) : null}

      {/* --------------------------- connected view -------------------------- */}

      {phase === "connected" && peer ? (
        <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-6">
          <div className="grid items-start gap-4 lg:grid-cols-[330px_minmax(0,1fr)] lg:gap-5">
            <aside className="flex flex-col gap-4">
              <DeviceCard
                name={peer.name}
                platform={peer.platform}
                info={connInfo}
                latency={latency}
                onDisconnect={() => void endSession()}
              />

              <div className="glass anim-fade-up rounded-[22px] p-4" style={{ animationDelay: "60ms" }}>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/35">
                  Quick actions
                </p>
                <div className="flex flex-col gap-2">
                  <button type="button" className="btn btn-primary w-full" onClick={pickFiles}>
                    <FileUp className="h-4 w-4" />
                    Send files
                  </button>
                  <button
                    type="button"
                    className="btn btn-glass w-full"
                    onClick={() => setShowText((v) => !v)}
                  >
                    <Type className="h-4 w-4" />
                    Send text or link
                  </button>
                </div>

                <div className="mt-4 border-t border-white/[0.06] pt-3.5">
                  <p className="mb-1.5 text-[10.5px] font-medium uppercase tracking-[0.12em] text-white/25">
                    You appear as
                  </p>
                  {editingName ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        autoFocus
                        value={nameDraft}
                        onChange={(e) => setNameDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveName();
                          if (e.key === "Escape") setEditingName(false);
                        }}
                        maxLength={40}
                        aria-label="Display name shown to the paired device"
                        className="h-9 min-w-0 flex-1 rounded-[10px] border border-white/10 bg-white/[0.05] px-3 text-[13px] text-white/90"
                      />
                      <button type="button" className="btn btn-glass h-9 px-3 text-[12.5px]" onClick={saveName}>
                        Save
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="group flex w-full items-center justify-between rounded-[10px] px-2 py-1.5 text-left transition-colors hover:bg-white/[0.04]"
                      onClick={() => {
                        setNameDraft(pcName);
                        setEditingName(true);
                      }}
                    >
                      <span className="truncate text-[13px] font-medium text-white/75">{pcName}</span>
                      <Pencil className="h-3.5 w-3.5 flex-none text-white/25 transition-colors group-hover:text-white/60" />
                    </button>
                  )}
                  <p className="mt-1 px-2 text-[10.5px] leading-relaxed text-white/40">
                    Stored on this device only — never uploaded.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => void endSession()}
                  className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-[12px] py-2 text-[12px] font-medium text-white/35 transition-colors hover:bg-[rgba(255,107,98,0.07)] hover:text-[#ff8a80]"
                >
                  <Unplug className="h-3.5 w-3.5" />
                  End session
                </button>
              </div>
            </aside>

            <main className="flex min-w-0 flex-col gap-4">
              {offer ? (
                <IncomingCard
                  offer={offer}
                  onAccept={(id) => engineRef.current?.acceptOffer(id)}
                  onDecline={(id) => engineRef.current?.declineOffer(id)}
                />
              ) : null}

              <button
                type="button"
                onClick={pickFiles}
                className={`drop-ring anim-fade-up flex min-h-[168px] w-full flex-col items-center justify-center gap-3 rounded-[24px] bg-white/[0.02] px-6 py-8 text-center ${dragOver ? "is-over" : ""}`}
                style={{ animationDelay: "100ms" }}
              >
                <IconTile size={46} tone={dragOver ? "accent" : "neutral"}>
                  <ArrowDownToLine className="h-5 w-5" />
                </IconTile>
                <span className="text-[15px] font-medium tracking-tight text-white/80">
                  Drop files anywhere to send
                </span>
                <span className="text-[12.5px] text-white/45">
                  or <span className="font-medium text-[#5ea8ff]">browse from this PC</span> — any type, any
                  size, multiple files
                </span>
              </button>

              <TransferList
                items={items}
                onCancel={(id) => engineRef.current?.cancelTransfer(id)}
                onClearFinished={() => setItems((prev) => prev.filter((i) => !TERMINAL.has(i.state)))}
                emptyHint="Files you send or receive will appear here with live progress."
              />

              {showText ? (
                <div className="glass anim-fade-up rounded-[22px] p-4">
                  <TextSharePanel
                    texts={texts}
                    onSend={(t) => engineRef.current?.sendText(t)}
                    placeholder="Paste a link or message…"
                    sendLabel="Send"
                  />
                </div>
              ) : null}

              <HistoryList entries={historyEntries} />
            </main>
          </div>
        </div>
      ) : null}

      {/* drop overlay */}
      {dragOver && phase === "connected" ? (
        <div className="anim-fade-in pointer-events-none fixed inset-0 z-40 flex items-center justify-center p-5">
          <div className="flex h-full w-full flex-col items-center justify-center gap-4 rounded-[32px] border-2 border-dashed border-[rgba(10,132,255,0.55)] bg-[rgba(8,10,14,0.72)] backdrop-blur-md">
            <IconTile size={64} tone="accent">
              <ArrowDownToLine className="h-7 w-7" />
            </IconTile>
            <p className="text-[19px] font-semibold tracking-tight text-white">Drop to send</p>
            <p className="text-[13px] text-white/45">
              Files go straight to {peer?.name ?? "your phone"} — never to a server
            </p>
          </div>
        </div>
      ) : null}

      {/* transient notice */}
      {notice ? (
        <div className="anim-fade-up fixed bottom-6 left-1/2 z-50 -translate-x-1/2" role="status">
          <div className="glass rounded-full px-5 py-2.5 text-[13px] font-medium text-white/80">
            {notice}
          </div>
        </div>
      ) : null}

      <footer className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-8 sm:px-6">
        <div className="border-t border-white/[0.05] pt-5">
          <LegalLinks />
        </div>
      </footer>

      <PrivacyNotice />
    </div>
  );
}
