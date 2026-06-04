"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { MapPin, RefreshCw, TrendingUp, TrendingDown } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

// Chargement dynamique (Leaflet = client only)
const ChoroplethPrix = dynamic(
  () => import("@/components/maps/ChoroplethPrix"),
  { ssr: false, loading: () => <div className="w-full h-full bg-gray-100 rounded-2xl animate-pulse min-h-[400px]" /> }
);

const COMMODITIES = [
  { key: "sorghum",    label: "Sorgho",    color: "#E04E2F", seuil: 320 },
  { key: "rice_local", label: "Riz local", color: "#1A2C42", seuil: 500 },
  { key: "maize",      label: "Maïs",      color: "#16A34A", seuil: 300 },
  { key: "millet",     label: "Mil",       color: "#D97706", seuil: 350 },
  { key: "cowpea",     label: "Niébé",     color: "#8B5CF6", seuil: 650 },
];

const ALL_REGIONS = [
  "Sahel", "Est", "Nord", "Centre-Nord", "Boucle du Mouhoun",
  "Centre", "Plateau Central", "Centre-Est", "Centre-Ouest",
  "Centre-Sud", "Hauts-Bassins", "Cascades", "Sud-Ouest",
];

const LEGEND = [
  { label: "< 70% du seuil",   color: "#166534" },
  { label: "70–85%",           color: "#16A34A" },
  { label: "85–95%",           color: "#86EFAC" },
  { label: "95–105%",          color: "#FDE68A" },
  { label: "105–115%",         color: "#F97316" },
  { label: "> 115% du seuil",  color: "#DC2626" },
];

interface LatestPrice { id: string; commodity: string; region: string; price: number; }

export default function DashboardCartePage() {
  const [commodity, setCommodity]     = useState("sorghum");
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  const activeCommodity = COMMODITIES.find((c) => c.key === commodity) ?? COMMODITIES[0];

  // Charger les prix pour toutes les régions
  const { data: latestData, isLoading, refetch } = useQuery<LatestPrice[]>({
    queryKey: ["carte-dashboard-prices", commodity],
    queryFn: async () => {
      const results = await Promise.allSettled(
        ALL_REGIONS.map((region) =>
          api.get(`/prices/latest?region=${encodeURIComponent(region)}`)
            .then(({ data }) => data as LatestPrice[])
            .catch(() => [] as LatestPrice[])
        )
      );
      const allPrices: LatestPrice[] = [];
      results.forEach((r) => { if (r.status === "fulfilled") allPrices.push(...r.value); });
      return allPrices;
    },
    staleTime: 5 * 60 * 1000,
  });

  const regionPrices = useMemo(() => {
    if (!latestData) return [];
    return latestData
      .filter((p) => p.commodity === commodity)
      .map((p) => ({ region: p.region, price: p.price, commodity: p.commodity }));
  }, [latestData, commodity]);

  const prices       = regionPrices.map((p) => p.price).filter(Boolean);
  const maxPrice     = prices.length ? Math.max(...prices) : 0;
  const minPrice     = prices.length ? Math.min(...prices) : 0;
  const avgPrice     = prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
  const aboveSeuil   = regionPrices.filter((p) => p.price > activeCommodity.seuil).length;
  const maxRegion    = regionPrices.find((p) => p.price === maxPrice);
  const minRegion    = regionPrices.find((p) => p.price === minPrice);
  const selectedData = selectedRegion ? regionPrices.find((p) => p.region === selectedRegion) : null;

  return (
    <div className="p-3 sm:p-6 lg:p-8 h-full">

      {/* En-tête */}
      <div className="flex items-center justify-between gap-3 mb-4 sm:mb-5">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Cartographie des prix</h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-0.5 hidden sm:block">
            Données WFP / SONAGESS · Burkina Faso · 13 régions
          </p>
        </div>
        <button onClick={() => refetch()}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors shrink-0">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Sélecteur produit — horizontal scroll sur mobile */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 lg:hidden no-scrollbar">
        {COMMODITIES.map((c) => (
          <button key={c.key}
            onClick={() => { setCommodity(c.key); setSelectedRegion(null); }}
            className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-colors",
              commodity === c.key ? "text-white" : "bg-gray-100 text-gray-600")}
            style={commodity === c.key ? { background: c.color } : {}}>
            {c.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-5" style={{ minHeight: "min(calc(100vh - 220px), 700px)" }}>

        {/* ── Panneau gauche — masqué sur mobile (intégré ci-dessus) ── */}
        <div className="hidden lg:block w-64 shrink-0 space-y-4 overflow-y-auto">

          {/* Sélecteur produit */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Produit</p>
            <div className="space-y-1.5">
              {COMMODITIES.map((c) => (
                <button key={c.key} onClick={() => { setCommodity(c.key); setSelectedRegion(null); }}
                  className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left",
                    commodity === c.key ? "text-white" : "text-gray-600 hover:bg-gray-50")}
                  style={commodity === c.key ? { background: c.color } : {}}>
                  <span className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: commodity === c.key ? "rgba(255,255,255,0.5)" : c.color }} />
                  <span className="flex-1">{c.label}</span>
                  {commodity === c.key && (
                    <span className="text-[10px] opacity-75">Seuil {c.seuil}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Statistiques</p>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : (
              <>
                {[
                  { label: "Prix moyen",      value: `${avgPrice} CFA/kg`, sub: "National" },
                  { label: "Plus cher",        value: maxRegion ? `${maxPrice} CFA/kg` : "—", sub: maxRegion?.region, up: true },
                  { label: "Moins cher",       value: minRegion ? `${minPrice} CFA/kg` : "—", sub: minRegion?.region, up: false },
                  { label: "Régions > seuil", value: `${aboveSeuil} / ${regionPrices.length}`, sub: `Seuil : ${activeCommodity.seuil} CFA/kg`, alert: aboveSeuil > 0 },
                ].map(({ label, value, sub, up, alert }) => (
                  <div key={label} className={cn("bg-gray-50 rounded-xl px-3 py-2.5",
                    alert && aboveSeuil > 0 ? "bg-red-50 border border-red-100" : "")}>
                    <p className="text-[10px] text-gray-400">{label}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className={cn("text-sm font-bold",
                        alert && aboveSeuil > 0 ? "text-[#E04E2F]" : "text-gray-900")}>{value}</p>
                      {up === true && <TrendingUp className="w-3 h-3 text-[#E04E2F]" />}
                      {up === false && <TrendingDown className="w-3 h-3 text-[#16A34A]" />}
                    </div>
                    {sub && <p className="text-[10px] text-gray-400">{sub}</p>}
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Région sélectionnée */}
          {selectedRegion && (
            <div className="bg-[#1A2C42] rounded-2xl p-4 text-white">
              <div className="flex items-center justify-between mb-2">
                <p className="font-bold">{selectedRegion}</p>
                <button onClick={() => setSelectedRegion(null)}
                  className="text-white/40 hover:text-white text-xs">✕</button>
              </div>
              {selectedData ? (
                <>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold" style={{ color: "#F5A623" }}>
                      {selectedData.price}
                    </span>
                    <span className="text-sm text-white/60">CFA/kg</span>
                  </div>
                  <div className="mt-2 h-1.5 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full rounded-full"
                      style={{
                        width: `${Math.min((selectedData.price / (activeCommodity.seuil * 1.3)) * 100, 100)}%`,
                        background: selectedData.price > activeCommodity.seuil ? "#E04E2F" : "#16A34A",
                      }} />
                  </div>
                  <p className="text-[10px] text-white/50 mt-1">
                    {selectedData.price > activeCommodity.seuil
                      ? `Seuil dépassé de ${Math.round(((selectedData.price - activeCommodity.seuil) / activeCommodity.seuil) * 100)}%`
                      : `${Math.round(((activeCommodity.seuil - selectedData.price) / activeCommodity.seuil) * 100)}% sous le seuil`}
                  </p>
                </>
              ) : (
                <p className="text-white/50 text-sm">Pas de données</p>
              )}
            </div>
          )}

          {/* Tableau prix rapide */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Prix par région</p>
            <div className="space-y-1">
              {isLoading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-8 bg-gray-100 rounded-lg animate-pulse" />
                  ))
                : ALL_REGIONS.map((region) => {
                    const rp = regionPrices.find((p) => p.region === region);
                    const price = rp?.price ?? 0;
                    const isSelected = selectedRegion === region;
                    return (
                      <button key={region}
                        onClick={() => setSelectedRegion(isSelected ? null : region)}
                        className={cn("w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all",
                          isSelected ? "bg-[#1A2C42]/10 ring-1 ring-[#1A2C42]/20" : "hover:bg-gray-50")}>
                        <span className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ background: price > activeCommodity.seuil ? "#DC2626" : price > 0 ? "#16A34A" : "#E5E7EB" }} />
                        <span className="flex-1 text-left text-gray-700 truncate">{region}</span>
                        <span className={cn("font-bold tabular-nums",
                          price > activeCommodity.seuil ? "text-[#E04E2F]" : "text-gray-600")}>
                          {price ? `${price}` : "—"}
                        </span>
                      </button>
                    );
                  })}
            </div>
          </div>
        </div>

        {/* ── Carte principale ── */}
        <div className="flex-1 flex flex-col gap-3">

          {/* Légende */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-2.5 flex items-center gap-3 flex-wrap">
            <p className="text-xs font-semibold text-gray-500">Échelle / seuil {activeCommodity.seuil} CFA/kg :</p>
            {LEGEND.map(({ label, color }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ background: color }} />
                <span className="text-[10px] text-gray-500">{label}</span>
              </div>
            ))}
          </div>

          {/* Carte */}
          <div className="flex-1 rounded-2xl overflow-hidden border border-gray-100 shadow-sm bg-gray-100 min-h-[400px]">
            <ChoroplethPrix
              prices={regionPrices}
              commodity={commodity}
              seuil={activeCommodity.seuil}
              unit="CFA/kg"
              onRegionClick={(region) => setSelectedRegion(region)}
            />
          </div>

          <p className="text-[10px] text-gray-400 text-right">
            Source : WFP VAM / SONAGESS Burkina Faso · Carte approximative
          </p>
        </div>
      </div>
    </div>
  );
}
