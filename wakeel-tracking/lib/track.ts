// lib/track.ts
// نادِها عند استخدام أي ميزة:  track("حاسبة الزكاة")
"use client";

export function track(name: string) {
  try {
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      keepalive: true,
      body: JSON.stringify({ type: "feature", name }),
    });
  } catch {}
}
