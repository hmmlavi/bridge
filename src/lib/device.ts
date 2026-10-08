import type { Platform } from "./types";

export interface DeviceIdentity {
  name: string;
  platform: Platform;
}

function cleanModel(raw: string): string {
  return raw
    .replace(/Build\/.*$/i, "")
    .replace(/[;)]+$/, "")
    .trim();
}

export function detectDevice(ua: string): DeviceIdentity {
  const s = ua || "";
  if (/android/i.test(s)) {
    // e.g. "Linux; Android 14; Pixel 8 Pro Build/..." or "Android 13; SM-S911B"
    const m = s.match(/Android\s[\d.]+;\s*([^;)]+)/i);
    let model = m ? cleanModel(m[1]) : "";
    if (/^SM-/i.test(model)) model = `Samsung ${model}`;
    if (/^wv\)?$/i.test(model) || !model) model = "";
    return { name: model || "Android Phone", platform: "android" };
  }
  if (/iPhone/i.test(s)) return { name: "iPhone", platform: "ios" };
  if (/iPad/i.test(s)) return { name: "iPad", platform: "ios" };
  if (/Windows NT/i.test(s)) return { name: "Windows PC", platform: "windows" };
  if (/Mac OS X/i.test(s)) return { name: "Mac", platform: "mac" };
  if (/Linux/i.test(s)) return { name: "Linux PC", platform: "linux" };
  return { name: "Device", platform: "other" };
}

export function platformLabel(p: Platform): string {
  switch (p) {
    case "android":
      return "Android";
    case "windows":
      return "Windows";
    case "ios":
      return "iOS";
    case "mac":
      return "macOS";
    case "linux":
      return "Linux";
    default:
      return "Device";
  }
}
