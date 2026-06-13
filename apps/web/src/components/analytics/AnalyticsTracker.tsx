"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const VISITOR_KEY = "fasodata.analytics.visitor_id";
const SESSION_KEY = "fasodata.analytics.session_id";

function getOrCreateId(key: string) {
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const value = crypto.randomUUID();
  window.localStorage.setItem(key, value);
  return value;
}

export function AnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/api")) return;
    if (navigator.doNotTrack === "1") return;

    const payload = {
      path: `${pathname}${window.location.search}`,
      title: document.title || null,
      referrer: document.referrer || null,
      visitor_id: getOrCreateId(VISITOR_KEY),
      session_id: getOrCreateId(SESSION_KEY),
    };
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api";
    const url = `${apiBase.replace(/\/$/, "")}/analytics/page-view`;
    const body = JSON.stringify(payload);

    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon(url, blob);
      return;
    }

    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {
      // Analytics must never block navigation.
    });
  }, [pathname]);

  return null;
}
