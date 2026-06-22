"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  TrendingUp, TrendingDown, Minus, AlertTriangle,
  ArrowRight, RefreshCw, MapPin, Bell, Database, Map,
} from "lucide-react";
import { cn } from "@/lib/utils";

const AlerteSubscribeWidget = dynamic(
  () => import("@/components/home/AlerteSubscribeWidget"),
  { ssr: false }
);

// ── Types ─────────────────────────────────────────────────────────────────────

interface LatestPrice {
  commodity:    string;
  region:       string;
  price:        number;
  price_date:   string;
  unit:         string;
  source?:      string;
  data_origin?: string;
  reporter?:    string | null;
  n_obs?:       number;
}

interface PriceSeries {
  commodity: string;
  points: Array<{ period: string; price: number }>;
}

// ── Config produits ────────────────────────────────────────────────────────────

const COMMODITIES = [
  { key: "sorghum",   label: "Sorgho",    emoji: "🌾", seuil: 320, color: "#E04E2F" },
  { key: "rice_local",label: "Riz local", emoji: "🍚", seuil: 500, color: "#1A2C42" },
  { key: "maize",     label: "Maïs",      emoji: "🌽", seuil: 300, color: "#16A34A" },
  { key: "millet",    label: "Mil",       emoji: "🌿", seuil: 350, color: "#D97706" },
  { key: "cowpea",    label: "Niébé",     emoji: "🫘", seuil: 650, color: "#8B5CF6" },
];

// Score de confiance basé sur le nombre d'observations
function confidenceScore(nObs: number | undefined): number | null {
  if (!nObs) return null;
  if (nObs >= 100) return 97;
  if (nObs >= 50)  return 93;
  if (nObs >= 20)  return 87;
  if (nObs >= 10)  return 78;
  return 65;
}

// ── Sparkline SVG inline ──────────────────────────────────────────────────────

function InlineSparkline({ data, up }: { data: number[]; up: boolean }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 56, h = 22;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 2) - 1;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={w} height={h} className="shrink-0">
      <polyline points={pts} fill="none"
        stroke={up ? "#16A34A" : "#E04E2F"}
        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Widget principal ──────────────────────────────────────────────────────────

export default function PrixDuJourWidget() {
  const [prices, setPrices]         = useState<LatestPrice[]>([]);
  const [sparklines, setSparklines] = useState<Record<string, number[]>>({});
  const [loading, setLoading]       = useState(true);
  const [lastUpdate, setLastUpdate] = useState<{ time: string; date: string } | null>(null);
  const [error, setError]           = useState(false);
  const [showAlert, setShowAlert]   = useState(false);

  const fetchPrices = async () => {
    setLoading(true);
    setError(false);
    try {
      const resp = await fetch(
        `${window.location.origin}/api/prices/latest?region=National&sources=wfp`,
        { cache: "no-store" }
      );
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data: LatestPrice[] = await resp.json();

      const seriesEntries = await Promise.all(
        COMMODITIES.map(async (commodity) => {
          const params = new URLSearchParams({
            commodity: commodity.key,
            region: "National",
            granularity: "monthly",
            start: "2022-01",
            sources: "wfp",
          });
          const r = await fetch(`${window.location.origin}/api/prices/series?${params}`, { cache: "no-store" });
          if (!r.ok) return [commodity.key, []] as const;
          const series = (await r.json()) as PriceSeries;
          return [commodity.key, series.points.slice(-8).map((pt) => pt.price)] as const;
        })
      );

      setPrices(data);
      setSparklines(Object.fromEntries(seriesEntries));
      const now = new Date();
      setLastUpdate({
        time: now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
        date: now.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }),
      });
    } catch {
      setError(true);
      setPrices([]);
      setSparklines({});
      setLastUpdate(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPrices(); }, []);

  const getTrend = (commodity: string, currentPrice: number) => {
    const hist = sparklines[commodity];
    if (!hist || hist.length < 2 || currentPrice === 0) return { pct: 0, up: false, flat: true };
    const prev = hist[hist.length - 2];
    if (!prev) return { pct: 0, up: false, flat: true };
    const pct = ((currentPrice - prev) / prev) * 100;
    return { pct: Math.abs(pct), up: pct > 0, flat: Math.abs(pct) < 0.5 };
  };

  // Alertes seuil dépassé
  const thresholdAlerts = prices.filter((p) => {
    const c = COMMODITIES.find((c) => c.key === p.commodity);
    return c && p.price > c.seuil;
  });

  // Alertes tendance : variation > 5% sur le dernier mois
  const trendAlerts = COMMODITIES.flatMap((c) => {
    const p = prices.find((px) => px.commodity === c.key);
    if (!p || p.price === 0) return [];
    const { pct, up, flat } = getTrend(c.key, p.price);
    if (flat || pct < 5) return [];
    return [{ label: c.label, pct, up, emoji: c.emoji }];
  });

  const validPrices = prices.filter((p) => p.price > 0);
  const totalObservations = validPrices.reduce((sum, p) => sum + (p.n_obs ?? 0), 0);
  const latestPriceDate = validPrices
    .map((p) => p.price_date)
    .filter(Boolean)
    .sort()
    .at(-1);
  const latestPriceDateLabel = latestPriceDate
    ? new Date(latestPriceDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
    : "-";
  const sourceLabel = validPrices.some((p) => `${p.source ?? ""} ${p.data_origin ?? ""}`.toLowerCase().includes("wfp"))
    ? "HDX/WFP"
    : "Source API";
  const networkStats = [
    { icon: Database, label: "Observations WFP", value: totalObservations > 0 ? totalObservations.toLocaleString("fr-FR") : "-" },
    { icon: TrendingUp, label: "Produits avec prix", value: `${validPrices.length}/${COMMODITIES.length}` },
    { icon: RefreshCw, label: "Date de reference", value: latestPriceDateLabel },
    { icon: MapPin, label: "Source", value: sourceLabel },
  ];

  return (
    <section className="bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Banniere donnees prix */}
        <div className="mb-8 rounded-2xl bg-[#1A2C42] px-5 py-4 flex flex-wrap items-center gap-4 justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-white font-bold text-sm">Prix alimentaires publics - donnees WFP</span>
          </div>
          <div className="flex flex-wrap gap-5">
            {networkStats.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-white/70" />
                <div>
                  <p className="text-white font-bold text-sm leading-none">
                    {loading ? <span className="inline-block h-3 w-12 rounded bg-white/20 align-middle" /> : value}
                  </p>
                  <p className="text-white/50 text-[10px]">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── En-tête ── */}
        <div className="flex items-start justify-between gap-4 mb-2 flex-wrap">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              🌾 Prix des céréales — Burkina Faso
            </h2>
            <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5" />
              Moyenne nationale - source publique HDX/WFP
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Date de mise à jour */}
            {lastUpdate && (
              <div className="hidden sm:flex flex-col items-end text-right">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider">Dernière mise à jour</span>
                <span className="text-xs font-semibold text-gray-700">{lastUpdate.date}</span>
                <span className="text-xs text-gray-500">{lastUpdate.time}</span>
              </div>
            )}
            <button onClick={fetchPrices} disabled={loading}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </button>
            <button onClick={() => setShowAlert(!showAlert)}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors",
                showAlert
                  ? "bg-[#E04E2F] text-white border-[#E04E2F]"
                  : "border-gray-200 text-gray-600 hover:border-[#E04E2F] hover:text-[#E04E2F]")}>
              <Bell className="w-4 h-4" />
              {showAlert ? "Fermer" : "Créer une alerte"}
            </button>
          </div>
        </div>

        {/* Date mise à jour — mobile */}
        {lastUpdate && (
          <p className="sm:hidden text-xs text-gray-400 mb-4">
            Mise à jour le {lastUpdate.date} à {lastUpdate.time}
          </p>
        )}

        {/* Widget abonnement */}
        {showAlert && (
          <div className="mb-6 max-w-sm">
            <AlerteSubscribeWidget onClose={() => setShowAlert(false)} />
          </div>
        )}

        {/* ── Alertes tendance ── */}
        {trendAlerts.length > 0 && (
          <div className="mb-4 space-y-2">
            {trendAlerts.map(({ label, pct, up, emoji }) => (
              <div key={label}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-2.5 border text-sm",
                  up
                    ? "bg-red-50 border-red-100 text-red-700"
                    : "bg-green-50 border-green-100 text-green-700"
                )}>
                <span>{up ? "⚠️" : "📉"}</span>
                <span className="font-medium">
                  {up ? "Hausse" : "Baisse"} du {emoji} {label} de{" "}
                  <strong>{pct.toFixed(1)}%</strong> sur le dernier relevé
                </span>
                <Link href="/carte-prix" className="ml-auto text-xs font-semibold hover:underline shrink-0">
                  Voir la carte →
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* ── Alertes seuil ── */}
        {thresholdAlerts.length > 0 && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-5">
            <AlertTriangle className="w-4 h-4 text-[#E04E2F] shrink-0" />
            <p className="text-sm text-[#E04E2F] font-medium">
              {thresholdAlerts.length === 1
                ? `⚠️ Le prix du ${COMMODITIES.find((c) => c.key === thresholdAlerts[0].commodity)?.label} dépasse le seuil d'alerte`
                : `⚠️ ${thresholdAlerts.length} produits dépassent leur seuil d'alerte`}
            </p>
            <Link href="/carte-prix" className="ml-auto text-xs font-semibold text-[#E04E2F] hover:underline shrink-0">
              Voir la carte →
            </Link>
          </div>
        )}

        {/* ── Grille des prix ── */}
        {!loading && !error && prices.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-5 py-8 text-center">
            <Database className="mx-auto mb-3 h-8 w-8 text-gray-300" />
            <p className="text-sm font-semibold text-gray-700">Aucun prix vérifié disponible</p>
            <p className="mx-auto mt-1 max-w-xl text-xs text-gray-400">
              Les prix apparaîtront ici dès qu'une collecte terrain ou HDX/WFP sera disponible.
            </p>
            <Link href="/datasets" className="mt-4 inline-flex text-xs font-semibold text-[#E04E2F] hover:underline">
              Explorer le catalogue
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {COMMODITIES.map((c) => {
              const p           = prices.find((px) => px.commodity === c.key);
              const price       = p?.price ?? 0;
              const hasPrice    = price > 0;
              const { pct, up, flat } = getTrend(c.key, price);
              const aboveSeuil  = hasPrice && price > c.seuil;
              const hist        = sparklines[c.key] ?? [];
              const nObs        = p?.n_obs;
              const confidence  = confidenceScore(nObs);
              const priceDate   = p?.price_date
                ? new Date(p.price_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
                : null;

              return (
                <Link key={c.key} href="/carte-prix"
                  className={cn(
                    "group relative rounded-2xl p-4 border transition-all hover:shadow-md hover:-translate-y-0.5 flex flex-col",
                    aboveSeuil ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-100 hover:border-gray-200"
                  )}>

                  {aboveSeuil && (
                    <div className="absolute top-3 right-3 w-2 h-2 bg-[#E04E2F] rounded-full animate-pulse" />
                  )}

                  {/* Emoji + label */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">{c.emoji}</span>
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{c.label}</span>
                  </div>

                  {loading ? (
                    <div className="space-y-2">
                      <div className="h-7 bg-gray-200 rounded animate-pulse w-3/4" />
                      <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
                    </div>
                  ) : (
                    <>
                      {/* Prix */}
                      <div className="flex items-baseline gap-1 mb-1">
                        {hasPrice ? (
                          <>
                            <span className={cn("text-2xl font-bold", aboveSeuil ? "text-[#E04E2F]" : "text-gray-900")}>
                              {price}
                            </span>
                            <span className="text-xs text-gray-400 font-medium">CFA/kg</span>
                          </>
                        ) : (
                          <span className="text-sm font-semibold text-gray-400 italic">Donnée indisponible</span>
                        )}
                      </div>

                      {/* Nombre de relevés */}
                      {hasPrice && nObs && (
                        <p className="text-[11px] text-gray-500 font-medium mb-1">
                          {nObs.toLocaleString("fr-FR")} observations WFP
                        </p>
                      )}

                      {/* Tendance + sparkline */}
                      {hasPrice && (
                        <div className="flex items-center justify-between mb-2">
                          <div className={cn("flex items-center gap-1 text-xs font-semibold",
                            flat ? "text-gray-400" : up ? "text-[#E04E2F]" : "text-[#16A34A]")}>
                            {flat ? <Minus className="w-3 h-3" /> : up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {!flat && `${up ? "+" : "-"}${pct.toFixed(1)}%`}
                          </div>
                          <InlineSparkline data={hist} up={up} />
                        </div>
                      )}

                      {/* Score de confiance */}
                      {hasPrice && confidence && (
                        <div className="mb-2">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[10px] text-gray-400">Confiance</span>
                            <span className={cn("text-[10px] font-bold",
                              confidence >= 90 ? "text-green-600" : confidence >= 75 ? "text-amber-500" : "text-gray-400")}>
                              {confidence}%
                            </span>
                          </div>
                          <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all"
                              style={{
                                width: `${confidence}%`,
                                background: confidence >= 90 ? "#16A34A" : confidence >= 75 ? "#D97706" : "#9CA3AF",
                              }} />
                          </div>
                        </div>
                      )}

                      {/* Seuil + date */}
                      <div className="mt-auto pt-1 border-t border-gray-100/60">
                        <p className="text-[10px] text-gray-400">
                          Seuil : {c.seuil} CFA/kg
                          {aboveSeuil && <span className="text-[#E04E2F] font-semibold ml-1">⚠️ dépassé</span>}
                        </p>
                        {priceDate && hasPrice && (
                          <p className="text-[10px] text-gray-400 mt-0.5">Relevé : {priceDate}</p>
                        )}
                      </div>
                    </>
                  )}
                </Link>
              );
            })}
          </div>
        )}

        {/* ── CTA Carte interactive ── */}
        <div className="mt-6 rounded-2xl bg-gradient-to-r from-[#1A2C42] to-[#1A2C42]/80 p-5 flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
              <Map className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">Carte interactive des prix</p>
              <p className="text-white/60 text-xs mt-0.5">
                Cliquez sur une région · prix par province · 13 régions couvertes
              </p>
            </div>
          </div>
          <Link href="/carte-prix"
            className="flex items-center gap-2 px-5 py-2.5 bg-[#E04E2F] text-white text-sm font-semibold rounded-xl hover:bg-[#c73e22] transition-colors shrink-0">
            Ouvrir la carte <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 flex-wrap gap-2">
          <p className="text-xs text-gray-400">
            Source affichee : HDX/WFP Food Prices, via l'API FasoData.
          </p>
          <Link href="/dashboard/prix"
            className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-[#E04E2F] transition-colors">
            📊 Séries temporelles →
          </Link>
        </div>

      </div>
    </section>
  );
}
