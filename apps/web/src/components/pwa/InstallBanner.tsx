"use client";

import { useEffect, useState } from "react";
import { Download, X, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Bannière "Installer l'application" — apparaît quand le navigateur
 * détecte que le site peut être installé (critères PWA satisfaits).
 * Persiste 24h après fermeture avant de réapparaître.
 */
export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Vérifier si déjà installé
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
      return;
    }

    // Vérifier si le user a déjà refusé récemment (24h)
    const dismissed = localStorage.getItem("pwa-banner-dismissed");
    if (dismissed && Date.now() - Number(dismissed) < 24 * 3600 * 1000) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstalled(true));

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setVisible(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem("pwa-banner-dismissed", String(Date.now()));
  };

  if (!visible || installed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-[10000]
                    bg-[#1A2C42] rounded-2xl shadow-2xl p-4 flex items-start gap-3 border border-white/10
                    animate-in slide-in-from-bottom-4 duration-300">
      {/* Icône */}
      <div className="w-10 h-10 bg-[#E04E2F] rounded-xl flex items-center justify-center shrink-0">
        <Smartphone className="w-5 h-5 text-white" />
      </div>

      {/* Texte */}
      <div className="flex-1">
        <p className="text-white font-bold text-sm">Installer FasoData</p>
        <p className="text-white/60 text-xs mt-0.5 leading-relaxed">
          Accès rapide + fonctionne hors connexion pour les relevés terrain.
        </p>
        <button
          onClick={handleInstall}
          className="flex items-center gap-1.5 mt-2.5 text-xs font-semibold text-white
                     bg-[#E04E2F] hover:bg-[#c73e22] px-3 py-1.5 rounded-lg transition-colors">
          <Download className="w-3.5 h-3.5" />
          Installer
        </button>
      </div>

      {/* Fermer */}
      <button onClick={handleDismiss}
        className="p-1 text-white/40 hover:text-white transition-colors shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
