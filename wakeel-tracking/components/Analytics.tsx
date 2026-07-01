"use client";

// components/Analytics.tsx
// يسجّل زيارة كل صفحة تلقائياً عند تغيّر المسار. ضعه مرة وحدة في app/layout.tsx.

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function Analytics() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    try {
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        keepalive: true,
        body: JSON.stringify({ type: "pageview", path: pathname }),
      });
    } catch {}
  }, [pathname]);

  return null;
}
