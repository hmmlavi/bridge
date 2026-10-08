"use client";

import type { SignalMessage } from "./rtc";
import type { Role } from "./types";

export async function postSignal(
  sessionId: string,
  token: string,
  role: Role,
  message: SignalMessage
): Promise<boolean> {
  try {
    const res = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}/signal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, role, message }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function postLeave(
  sessionId: string,
  token: string,
  role: Role
): Promise<void> {
  try {
    await fetch(`/api/sessions/${encodeURIComponent(sessionId)}/leave`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, role }),
    });
  } catch {
    /* best effort */
  }
}

export function leaveBeacon(sessionId: string, token: string, role: Role) {
  try {
    const blob = new Blob([JSON.stringify({ token, role })], {
      type: "application/json",
    });
    navigator.sendBeacon(`/api/sessions/${encodeURIComponent(sessionId)}/leave`, blob);
  } catch {
    /* best effort */
  }
}

export async function deleteSession(sessionId: string, token: string): Promise<void> {
  try {
    await fetch(`/api/sessions/${encodeURIComponent(sessionId)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
  } catch {
    /* best effort */
  }
}
