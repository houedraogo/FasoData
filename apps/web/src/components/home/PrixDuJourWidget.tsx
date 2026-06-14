"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  TrendingUp, TrendingDown, Minus, AlertTriangle,
  ArrowRight, RefreshCw, MapPin, Bell, X, Database,
} from "lucide-react";
import { cn } from "@/lib/utils";

const AlerteSubscribeWidget = dynamic(
  () => import("@/components/home/AlerteSubscribeWidget"),
  { ssr: false }
);

// ── Types ─────────────────────────────────────────────────────────────────────

interface LatestPrice {
  commodity:  string;
  region:     string;
  price:      number;
  price_date: string;
  unit:       string;
  source?:    string;
  data_origin?: string;
  reporter?:  string | null;
  n_obs?:     number;
}

interface PriceSeries {
  commodity: string;
  points: Array<{ period: string; price: number }>;
}

// ── Config produits ────────────────────────────────────────────────────────────

const COMMODITIES = [
  { key: "sorghum",    label: "Sorgho",    emoji: "🌾", seuil: 320, color: "#E04E2F" },
  { key: "rice_local",    label: "Riz local",   emoji: "🍚", seuil: 500, color: "#1A2C42" },
  { key: "maize",      label: "Maïs",      emoji: "🌽", seuil: 300, color: "#16A34A" },
  { key: "millet",     label: "Mil",       emoji: "🌿", seuil: 350, color: "#D97706" },
  { key: "cowpea",     label: "Niébé",     emoji: "🫘", seuil: 650, color: "#8B5CF6" },
];

// ── Sparkline SVG inline (pas de Recharts pour alléger la homepage) ──────────

function InlineSparkline({ data, color, up }: { data: number[]; color: string; up: boolean }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 60, h = 24;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 2) - 1;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={w} height={h} className="shrink-0">
      <polyline points={pts} fill="none" stroke={up ? "#16A34A" : "#E04E2F"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Widget principal ──────────────────────────────────────────────────────────

export default function PrixDuJourWidget() {
  const [prices, setPrices]       = useState<LatestPrice[]>([]);
  const [sparklines, setSparklines] = useState<Record<string, number[]>>({});
  const [loading, setLoading]     = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const [error, setError]         = useState(false);
  const [showAlert, setShowAlert] = useState(false);

  const fetchPrices = async () => {
    setLoading(true);
    setError(false);
    try {
      // Appel via le proxy Nginx /api → FastAPI (fonctionne en dev ET prod)
      const resp = await fetch(`${window.location.origin}/api/prices/latest?region=National&sources=wfp`, {
        cache: "no-store",
      });
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
          const seriesResp = await fetch(`${window.location.origin}/api/prices/series?${params}`, {
            cache: "no-store",
          });
          if (!seriesResp.ok) return [commodity.key, []] as const;
          const series = (await seriesResp.json()) as PriceSeries;
          return [commodity.key, series.points.slice(-8).map((point) => point.price)] as const;
        })
      );
      setPrices(data);
      setSparklines(Object.fromEntries(seriesEntries));
      setLastUpdate(new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
    } catch {
      setError(true);
      setPrices([]);
      setSparklines({});
      setLastUpdate("indisponible");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPrices(); }, []);

  // Calculer la tendance (comparaison avec le sparkline avant-dernier point)
  const getTrend = (commodity: string, currentPrice: number) => {
    const hist = sparklines[commodity];
    if (!hist || hist.length < 2) return { pct: 0, up: false, flat: true };
    const prev = hist[hist.length - 2];
    const pct  = ((currentPrice - prev) / prev) * 100;
    return { pct: Math.abs(pct), up: pct > 0, flat: Math.abs(pct) < 0.5 };
  };

  // Alertes : produits au-dessus du seuil
  const alerts = prices.filter((p) => {
    const c = COMMODITIES.find((c) => c.key === p.commodity);
    return c && p.price > c.seuil;
  });

  return (
    <section className="bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* En-tête */}
        <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              🌾 Prix des céréales — Burkina Faso
            </h2>
            <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5" />
              Moyenne nationale · Source publique HDX/WFP
              {lastUpdate && <span className="text-gray-400">· Mis à jour {lastUpdate}</span>}
              {error && <span className="text-amber-500 text-xs">· prix indisponibles</span>}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchPrices} disabled={loading}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </button>
            <button onClick={() => setShowAlert(!showAlert)}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors",
                showAlert ? "bg-[#E04E2F] text-white border-[#E04E2F]" : "border-gray-200 text-gray-600 hover:border-[#E04E2F] hover:text-[#E04E2F]")}>
              <Bell className="w-4 h-4" />
              {showAlert ? "Fermer" : "Créer une alerte"}
            </button>
            <Link href="/carte-prix"
              className="hidden sm:flex items-center gap-2 text-sm font-medium text-[#E04E2F] hover:text-[#c73e22] transition-colors">
              Carte des prix <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Widget d'abonnement aux alertes */}
        {showAlert && (
          <div className="mb-6 max-w-sm">
            <AlerteSubscribeWidget onClose={() => setShowAlert(false)} />
          </div>
        )}

        {/* Alerte seuils */}
        {alerts.length > 0 && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-5">
            <AlertTriangle className="w-4 h-4 text-[#E04E2F] shrink-0" />
            <p className="text-sm text-[#E04E2F] font-medium">
              {alerts.length === 1
                ? `⚠️ Le prix du ${COMMODITIES.find((c) => c.key === alerts[0].commodity)?.label} dépasse le seuil d'alerte`
                : `⚠️ ${alerts.length} produits dépassent leur seuil d'alerte`}
            </p>
            <Link href="/carte-prix" className="ml-auto text-xs font-semibold text-[#E04E2F] hover:underline shrink-0">
              Voir la carte →
            </Link>
          </div>
        )}

        {/* Grille des prix */}
        {!loading && !error && prices.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-5 py-8 text-center">
            <Database className="mx-auto mb-3 h-8 w-8 text-gray-300" />
            <p className="text-sm font-semibold text-gray-700">Aucun prix vérifié disponible</p>
            <p className="mx-auto mt-1 max-w-xl text-xs text-gray-400">
              Les prix publics apparaîtront ici dès qu’une source HDX/WFP ou une collecte terrain validée sera disponible.
            </p>
            <Link href="/datasets" className="mt-4 inline-flex text-xs font-semibold text-[#E04E2F] hover:underline">
              Explorer le catalogue
            </Link>
          </div>
        ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {COMMODITIES.map((c) => {
            const p       = prices.find((px) => px.commodity === c.key);
            const price   = p?.price ?? 0;
            const { pct, up, flat } = getTrend(c.key, price);
            const aboveSeuil = price > c.seuil;
            const hist       = sparklines[c.key] ?? [];
            const observationCount = p?.n_obs ? `${p.n_obs} obs.` : "source WFP";
            const priceDate = p?.price_date
              ? new Date(p.price_date).toLocaleDateString("fr-FR", { month: "short", year: "numeric" })
              : null;

            return (
              <Link key={c.key} href="/carte-prix"
                className={cn(
                  "group relative rounded-2xl p-4 border transition-all hover:shadow-md hover:-translate-y-0.5",
                  aboveSeuil ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-100 hover:border-gray-200"
                )}>

                {/* Indicateur seuil */}
                {aboveSeuil && (
                  <div className="absolute top-3 right-3 w-2 h-2 bg-[#E04E2F] rounded-full animate-pulse" />
                )}

                {/* Emoji + label */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">{c.emoji}</span>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{c.label}</span>
                </div>

                {/* Prix */}
                {loading ? (
                  <div className="space-y-2">
                    <div className="h-7 bg-gray-200 rounded animate-pulse w-3/4" />
                    <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className={cn("text-2xl font-bold", aboveSeuil ? "text-[#E04E2F]" : "text-gray-900")}>
                        {price > 0 ? price : "—"}
                      </span>
                      <span className="text-xs text-gray-400 font-medium">CFA/kg</span>
                    </div>

                    {/* Tendance */}
                    <div className="flex items-center justify-between">
                      <div className={cn("flex items-center gap-1 text-xs font-semibold",
                        flat ? "text-gray-400" : up ? "text-[#E04E2F]" : "text-[#16A34A]")}>
                        {flat ? <Minus className="w-3 h-3" /> : up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {!flat && `${up ? "+" : "-"}${pct.toFixed(1)}%`}
                      </div>
                      <InlineSparkline data={hist} color={c.color} up={up} />
                    </div>

                    {/* Seuil */}
                    <div className="mt-2">
                      <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min((price / (c.seuil * 1.4)) * 100, 100)}%`,
                            background: aboveSeuil ? "#E04E2F" : "#16A34A",
                          }} />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">
                        Seuil : {c.seuil} CFA/kg
                        {aboveSeuil && <span className="text-[#E04E2F] font-semibold ml-1">⚠️ dépassé</span>}
                      </p>
                      <p className="mt-1 truncate text-[10px] font-medium text-gray-400">
                        {p ? `HDX/WFP · ${priceDate} · ${observationCount}` : "HDX/WFP indisponible"}
                      </p>
                    </div>
                  </>
                )}
              </Link>
            );
          })}
        </div>
        )}

        {/* Footer widget */}
        <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-100 flex-wrap gap-3">
          <p className="text-xs text-gray-400">
            Source publique HDX/WFP Food Prices · observations Burkina Faso
          </p>
          <div className="flex items-center gap-4">
            <Link href="/carte-prix"
              className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-[#1A2C42] transition-colors">
              <MapPin className="w-3.5 h-3.5" /> Carte régionale →
            </Link>
            <Link href="/dashboard/prix"
              className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-[#E04E2F] transition-colors">
              📊 Séries temporelles →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
