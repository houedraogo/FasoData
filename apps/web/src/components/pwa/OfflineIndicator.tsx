"use client";

import { useEffect, useState } from "react";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Indicateur de connexion + notification de sync réussie.
 * Affiché en bas de l'écran sur toutes les pages.
 */
export default function OfflineIndicator() {
  const [online, setOnline] = useState(true);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  useEffect(() => {
    setOnline(navigator.onLine);

    const goOnline  = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online",  goOnline);
    window.addEventListener("offline", goOffline);

    // Écouter les notifications de sync du SW
    const onSync = (e: CustomEvent) => {
      const count = e.detail.count;
      setSyncMsg(`✅ ${count} relevé(s) synchronisé(s) !`);
      setTimeout(() => setSyncMsg(null), 4000);
    };
    window.addEventListener("sw-sync-complete" as keyof WindowEventMap, onSync as EventListener);

    return () => {
      window.removeEventListener("online",  goOnline);
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("sw-sync-complete" as keyof WindowEventMap, onSync as EventListener);
    };
  }, []);

  if (online && !syncMsg) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2">
      {/* Toast sync */}
      {syncMsg && (
        <div className="bg-[#16A34A] text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg
                        flex items-center gap-2 animate-in slide-in-from-bottom-2 duration-200">
          <RefreshCw className="w-4 h-4" />
          {syncMsg}
        </div>
      )}

      {/* Badge hors-ligne */}
      {!online && (
        <div className="bg-[#1A2C42]/95 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg
                        flex items-center gap-2 backdrop-blur-sm border border-white/10">
          <WifiOff className="w-4 h-4 text-amber-400" />
          <span>Hors connexion — relevés sauvegardés localement</span>
        </div>
      )}
    </div>
  );
}
