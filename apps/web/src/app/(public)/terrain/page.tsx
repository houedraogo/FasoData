"use client";

import { useState, useEffect } from "react";
import {
  Wifi, WifiOff, Send, CheckCircle, Clock, Trash2,
  RefreshCw, MapPin, ChevronDown, Bell, BarChart2,
} from "lucide-react";
import Link from "next/link";
import {
  queuePriceEntry, getPendingEntries, manualSync, requestBackgroundSync,
  type OfflinePriceEntry,
} from "@/lib/offlineStore";
import { cn } from "@/lib/utils";

// ── Config ─────────────────────────────────────────────────────────────────────

const COMMODITIES = [
  { key: "sorghum",    label: "Sorgho",    emoji: "🌾" },
  { key: "rice_local", label: "Riz local", emoji: "🍚" },
  { key: "maize",      label: "Maïs",      emoji: "🌽" },
  { key: "millet",     label: "Mil",       emoji: "🌿" },
  { key: "cowpea",     label: "Niébé",     emoji: "🫘" },
  { key: "groundnut",  label: "Arachide",  emoji: "🥜" },
];

const REGIONS = [
  "Sahel", "Centre", "Hauts-Bassins", "Est", "Nord",
  "Centre-Nord", "Centre-Ouest", "Centre-Est", "Centre-Sud",
  "Plateau Central", "Boucle du Mouhoun", "Cascades", "Sud-Ouest",
];

// ── Page principale ───────────────────────────────────────────────────────────

export default function TerrainPage() {
  const [online, setOnline]           = useState(true);
  const [commodity, setCommodity]     = useState("sorghum");
  const [region, setRegion]           = useState("Sahel");
  const [price, setPrice]             = useState("");
  const [reporter, setReporter]       = useState(() =>
    typeof window !== "undefined" ? (localStorage.getItem("terrain-reporter") ?? "") : ""
  );
  const [queue, setQueue]             = useState<OfflinePriceEntry[]>([]);
  const [sending, setSending]         = useState(false);
  const [lastResult, setLastResult]   = useState<{ ok: boolean; msg: string } | null>(null);
  const [syncing, setSyncing]         = useState(false);
  const [syncResult, setSyncResult]   = useState<{ synced: number; failed: number } | null>(null);

  // ── Connexion ──────────────────────────────────────────────────────────────
  useEffect(() => {
    setOnline(navigator.onLine);
    const goOnline  = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online",  goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online",  goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // ── Charger la file d'attente ──────────────────────────────────────────────
  const refreshQueue = async () => {
    try { setQueue(await getPendingEntries()); } catch { /* IndexedDB pas encore dispo */ }
  };

  useEffect(() => { refreshQueue(); }, []);

  // Sauvegarder le reporter
  useEffect(() => {
    if (reporter && typeof window !== "undefined")
      localStorage.setItem("terrain-reporter", reporter);
  }, [reporter]);

  // ── Soumettre un relevé ────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(price.replace(",", "."));
    if (!price || isNaN(priceNum) || priceNum <= 0) {
      setLastResult({ ok: false, msg: "Prix invalide" });
      return;
    }

    setSending(true);
    setLastResult(null);

    const entry: Omit<OfflinePriceEntry, "id" | "synced"> = {
      commodity, region,
      price:       priceNum,
      reporter:    reporter || "enquêteur",
      submittedAt: new Date().toISOString(),
    };

    if (online) {
      // Envoi direct
      try {
        const fd = new URLSearchParams();
        fd.append("from", reporter || "+22600000000");
        fd.append("to",   "+22699000000");
        fd.append("text", `${commodity.toUpperCase()} ${region.toUpperCase()} ${priceNum}`);
        fd.append("date", new Date().toISOString());
        fd.append("id",   `web_${Date.now()}`);

        const resp = await fetch("/api/prices/sms/at-callback", {
          method:  "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body:    fd.toString(),
        });

        if (resp.ok) {
          setLastResult({ ok: true, msg: `✅ Envoyé : ${COMMODITIES.find(c=>c.key===commodity)?.label} · ${region} · ${priceNum} CFA/kg` });
          setPrice("");
        } else {
          throw new Error("API error");
        }
      } catch {
        // Fallback : mettre en file
        await queuePriceEntry(entry);
        setLastResult({ ok: true, msg: "⚡ Sauvegardé localement — sera synchronisé dès la connexion" });
        setPrice("");
        await refreshQueue();
      }
    } else {
      // Hors ligne : file d'attente
      await queuePriceEntry(entry);
      await requestBackgroundSync();
      setLastResult({ ok: true, msg: "📥 Sauvegardé hors-ligne — synchronisation automatique au retour de la connexion" });
      setPrice("");
      await refreshQueue();
    }

    setSending(false);
  };

  // ── Synchronisation manuelle ───────────────────────────────────────────────
  const handleSync = async () => {
    if (!online) { setLastResult({ ok: false, msg: "Pas de connexion" }); return; }
    setSyncing(true);
    const result = await manualSync();
    setSyncResult(result);
    await refreshQueue();
    setSyncing(false);
    setTimeout(() => setSyncResult(null), 5000);
  };

  const activeCom = COMMODITIES.find((c) => c.key === commodity);

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex flex-col">

      {/* ── Header ── */}
      <header className="bg-[#1A2C42] px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#E04E2F] rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-sm">FD</span>
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">FasoData Terrain</p>
            <p className="text-white/50 text-[10px]">Collecte de prix hors-ligne</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Indicateur connexion */}
          <div className={cn("flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full",
            online ? "bg-green-900/40 text-green-400" : "bg-amber-900/40 text-amber-400")}>
            {online ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            {online ? "En ligne" : "Hors ligne"}
          </div>
          {/* File d'attente */}
          {queue.length > 0 && (
            <div className="flex items-center gap-1 bg-[#E04E2F]/20 text-[#E04E2F] text-[10px] font-bold px-2 py-1 rounded-full">
              <Clock className="w-3 h-3" />
              {queue.length} en attente
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 px-4 py-5 space-y-4 max-w-lg mx-auto w-full">

        {/* ── Formulaire de saisie ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#E04E2F]" />
            <h1 className="font-bold text-gray-900">Saisir un relevé de prix</h1>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Produit — grid de boutons */}
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                Produit
              </label>
              <div className="grid grid-cols-3 gap-2">
                {COMMODITIES.map((c) => (
                  <button key={c.key} type="button"
                    onClick={() => setCommodity(c.key)}
                    className={cn(
                      "flex flex-col items-center gap-1 py-3 rounded-xl border text-xs font-semibold transition-all",
                      commodity === c.key
                        ? "bg-[#1A2C42] text-white border-[#1A2C42]"
                        : "bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300"
                    )}>
                    <span className="text-xl">{c.emoji}</span>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Région */}
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Région / Marché
              </label>
              <div className="relative">
                <select value={region} onChange={(e) => setRegion(e.target.value)}
                  className="w-full appearance-none px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#1A2C42]/20 bg-white">
                  {REGIONS.map((r) => <option key={r}>{r}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Prix */}
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Prix observé (CFA/kg)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl pointer-events-none">
                  {activeCom?.emoji}
                </span>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="ex: 285"
                  inputMode="decimal"
                  className="w-full pl-12 pr-16 py-3.5 border border-gray-200 rounded-xl text-xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-[#E04E2F]/30 focus:border-[#E04E2F]"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">
                  CFA/kg
                </span>
              </div>
            </div>

            {/* Identifiant enquêteur */}
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Votre identifiant (numéro ou nom)
              </label>
              <input
                type="text"
                value={reporter}
                onChange={(e) => setReporter(e.target.value)}
                placeholder="+226 70 11 22 33"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A2C42]/20"
              />
              <p className="text-[10px] text-gray-400 mt-1">Mémorisé pour les prochaines saisies</p>
            </div>

            {/* Résultat */}
            {lastResult && (
              <div className={cn("px-4 py-3 rounded-xl text-sm font-medium flex items-start gap-2",
                lastResult.ok ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-600 border border-red-100")}>
                {lastResult.ok ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" /> : <span>⚠️</span>}
                {lastResult.msg}
              </div>
            )}

            {/* Bouton soumettre */}
            <button type="submit" disabled={sending || !price}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-base
                         bg-[#E04E2F] hover:bg-[#c73e22] disabled:opacity-50 text-white transition-colors">
              {sending ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              {sending ? "Envoi…" : online ? "Envoyer le relevé" : "Sauvegarder hors-ligne"}
            </button>
          </form>
        </div>

        {/* ── File d'attente hors-ligne ── */}
        {queue.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-amber-100 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-amber-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <h2 className="font-bold text-gray-900 text-sm">
                  {queue.length} relevé(s) en attente
                </h2>
              </div>
              {online && (
                <button onClick={handleSync} disabled={syncing}
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#1A2C42] hover:text-[#E04E2F] transition-colors">
                  <RefreshCw className={cn("w-3.5 h-3.5", syncing && "animate-spin")} />
                  {syncing ? "Sync…" : "Synchroniser"}
                </button>
              )}
            </div>

            {syncResult && (
              <div className="px-4 py-2 bg-green-50 border-b border-green-100 text-xs text-green-700 font-medium">
                ✅ {syncResult.synced} synchronisé(s){syncResult.failed > 0 ? ` · ${syncResult.failed} échec(s)` : ""}
              </div>
            )}

            <div className="divide-y divide-gray-50">
              {queue.map((entry) => {
                const c = COMMODITIES.find((c) => c.key === entry.commodity);
                const dt = new Date(entry.submittedAt);
                return (
                  <div key={entry.id} className="px-4 py-3 flex items-center gap-3">
                    <span className="text-xl shrink-0">{c?.emoji ?? "📦"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">
                        {c?.label} · {entry.region} · <span className="text-[#E04E2F]">{entry.price} CFA/kg</span>
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {dt.toLocaleDateString("fr-FR")} {dt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded-full font-semibold shrink-0">
                      <Clock className="w-3 h-3" /> En attente
                    </div>
                  </div>
                );
              })}
            </div>

            {!online && (
              <div className="px-4 py-3 bg-amber-50 text-xs text-amber-700 text-center border-t border-amber-100">
                📡 Synchronisation automatique dès le retour de la connexion
              </div>
            )}
          </div>
        )}

        {/* ── Liens rapides ── */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/carte-prix"
            className="flex items-center gap-2.5 bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 hover:border-gray-200 transition-colors">
            <MapPin className="w-5 h-5 text-[#1A2C42]" />
            <div>
              <p className="text-xs font-semibold text-gray-800">Carte des prix</p>
              <p className="text-[10px] text-gray-400">Voir la carte</p>
            </div>
          </Link>
          <Link href="/dashboard/prix"
            className="flex items-center gap-2.5 bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 hover:border-gray-200 transition-colors">
            <BarChart2 className="w-5 h-5 text-[#E04E2F]" />
            <div>
              <p className="text-xs font-semibold text-gray-800">Graphiques</p>
              <p className="text-[10px] text-gray-400">Séries temporelles</p>
            </div>
          </Link>
        </div>

        {/* Aide */}
        <div className="bg-[#1A2C42]/5 rounded-xl p-4 text-xs text-gray-500 space-y-1">
          <p className="font-semibold text-gray-700">💡 Cette page fonctionne sans internet</p>
          <p>• Vos relevés sont sauvegardés localement quand vous êtes hors-ligne</p>
          <p>• Ils seront envoyés automatiquement dès que la connexion revient</p>
          <p>• Installez l'application pour un accès encore plus rapide</p>
        </div>
      </div>
    </div>
  );
}
