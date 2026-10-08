export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let v = bytes;
  let u = -1;
  do {
    v /= 1024;
    u++;
  } while (v >= 1024 && u < units.length - 1);
  const digits = v >= 100 ? 0 : v >= 10 ? 1 : 2;
  return `${v.toFixed(digits)} ${units[u]}`;
}

export function formatSpeed(bytesPerSec: number): string {
  if (!Number.isFinite(bytesPerSec) || bytesPerSec <= 0) return "—";
  return `${formatBytes(bytesPerSec)}/s`;
}

export function formatEta(seconds: number | null): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return "—";
  if (seconds < 1) return "<1s left";
  if (seconds < 60) return `${Math.ceil(seconds)}s left`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m < 60) return `${m}m ${s}s left`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m left`;
}

export function formatClock(ts: number): string {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function formatCountdown(msLeft: number): string {
  if (msLeft <= 0) return "0:00";
  const total = Math.ceil(msLeft / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function shortId(id: string): string {
  return id.slice(0, 6).toUpperCase();
}

const URL_RE = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)/gi;

export function splitTextAndUrls(text: string): Array<{ text: string; url: string | null }> {
  const parts: Array<{ text: string; url: string | null }> = [];
  let last = 0;
  for (const match of text.matchAll(URL_RE)) {
    const idx = match.index ?? 0;
    if (idx > last) parts.push({ text: text.slice(last, idx), url: null });
    const raw = match[0];
    parts.push({ text: raw, url: raw.startsWith("http") ? raw : `https://${raw}` });
    last = idx + raw.length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), url: null });
  return parts;
}
