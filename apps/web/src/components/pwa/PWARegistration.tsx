"use client";

import { useEffect } from "react";

/**
 * Enregistre le Service Worker et écoute les messages de sync.
 * À inclure une seule fois dans le layout racine.
 */
export default function PWARegistration() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        console.log("[PWA] Service Worker enregistré :", reg.scope);

        // Écouter les messages du SW (sync réussie, etc.)
        navigator.serviceWorker.addEventListener("message", (event) => {
          if (event.data?.type === "SYNC_COMPLETE") {
            const count = event.data.count;
            if (count > 0) {
              // Déclencher un toast (via window event)
              window.dispatchEvent(
                new CustomEvent("sw-sync-complete", { detail: { count } })
              );
            }
          }
        });

      } catch (err) {
        console.warn("[PWA] Échec enregistrement SW :", err);
      }
    };

    window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);

  return null;  // Composant invisible
}
