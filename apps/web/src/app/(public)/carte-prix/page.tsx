"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import {
  MapPin, TrendingUp, TrendingDown, AlertTriangle,
  RefreshCw, Info, Database,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

// ── Chargement dynamique (Leaflet nécessite window) ───────────────────────────
const ChoroplethPrix = dynamic(
  () => import("@/components/maps/ChoroplethPrix"),
  { ssr: false, loading: () => <div className="w-full h-full bg-gray-100 rounded-2xl animate-pulse" /> }
);

// ── Config produits ───────────────────────────────────────────────────────────

const COMMODITIES = [
  { key: "sorghum",    label: "Sorgho",    color: "#E04E2F", seuil: 320 },
  { key: "rice_local", label: "Riz local", color: "#1A2C42", seuil: 500 },
  { key: "maize",      label: "Maïs",      color: "#16A34A", seuil: 300 },
  { key: "millet",     label: "Mil",       color: "#D97706", seuil: 350 },
  { key: "cowpea",     label: "Niébé",     color: "#8B5CF6", seuil: 650 },
  { key: "groundnut",  label: "Arachide",  color: "#0EA5E9", seuil: 650 },
];

const ALL_REGIONS = [
  "Sahel", "Est", "Nord", "Centre-Nord", "Boucle du Mouhoun",
  "Centre", "Plateau Central", "Centre-Est", "Centre-Ouest",
  "Centre-Sud", "Hauts-Bassins", "Cascades", "Sud-Ouest",
];

// Légende de l'échelle des couleurs
const LEGEND = [
  { label: "< 70% du seuil",    color: "#166534", desc: "Abondance" },
  { label: "70–85%",            color: "#16A34A", desc: "Normal" },
  { label: "85–95%",            color: "#86EFAC", desc: "Stable" },
  { label: "95–105% (seuil)",   color: "#FDE68A", desc: "Vigilance" },
  { label: "105–115%",          color: "#F97316", desc: "Tension" },
  { label: "> 115% du seuil",   color: "#DC2626", desc: "Crise" },
  { label: "Pas de données",    color: "#E5E7EB", desc: "" },
];

// ── Types ─────────────────────────────────────────────────────────────────────

interface LatestPrice {
  id:         string;
  commodity:  string;
  region:     string;
  price:      number;
  price_date: string;
  unit:       string;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function CartePrixPage() {
  const [commodity, setCommodity]         = useState("sorghum");
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  const activeCommodity = COMMODITIES.find((c) => c.key === commodity) ?? COMMODITIES[0];

  // ── Charger les derniers prix par région ──────────────────────────────────
  // On fait une requête par région pour avoir la granularité régionale
  const { data: latestData, isLoading, refetch } = useQuery<LatestPrice[]>({
    queryKey: ["carte-prix-latest", commodity],
    queryFn: async () => {
      // Récupérer les derniers prix pour toutes les régions
      const results = await Promise.allSettled(
        ALL_REGIONS.map((region) =>
          api.get(`/prices/latest?region=${encodeURIComponent(region)}`)
            .then(({ data }) => data as LatestPrice[])
            .catch(() => [] as LatestPrice[])
        )
      );

      const allPrices: LatestPrice[] = [];
      results.forEach((r) => {
        if (r.status === "fulfilled") allPrices.push(...r.value);
      });
      return allPrices;
    },
    staleTime: 5 * 60 * 1000,  // 5 min cache
  });

  // Filtrer par produit sélectionné
  const regionPrices = useMemo(() => {
    if (!latestData) return [];
    return latestData
      .filter((p) => p.commodity === commodity)
      .map((p) => ({ region: p.region, price: p.price, commodity: p.commodity }));
  }, [latestData, commodity]);

  // Région sélectionnée — données
  const selectedData = selectedRegion
    ? regionPrices.find((p) => p.region === selectedRegion)
    : null;

  // Stats globales
  const prices = regionPrices.map((p) => p.price).filter((v) => v > 0);
  const maxPrice    = prices.length ? Math.max(...prices) : 0;
  const minPrice    = prices.length ? Math.min(...prices) : 0;
  const avgPrice    = prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
  const aboveSeuil  = regionPrices.filter((p) => p.price > activeCommodity.seuil).length;

  const maxRegion = regionPrices.find((p) => p.price === maxPrice);
  const minRegion = regionPrices.find((p) => p.price === minPrice);

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex flex-col">

      {/* ── En-tête ── */}
      <header className="bg-[#1A2C42] px-4 sm:px-8 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#E04E2F] rounded-xl flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg leading-tight">Carte des prix alimentaires</h1>
            <p className="text-white/50 text-xs">Burkina Faso · 13 régions · Données WFP / SONAGESS</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a href="/dashboard/prix" className="hidden sm:flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors">
            <TrendingUp className="w-3.5 h-3.5" /> Graphiques →
          </a>
          <button onClick={() => refetch()}
            className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ── Corps ── */}
      <div className="flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden">

        {/* ── Panneau gauche — contrôles ── */}
        <aside className="w-full lg:w-72 bg-white border-r border-gray-100 flex flex-col shrink-0 overflow-y-auto">

          {/* Sélecteur produit */}
          <div className="p-5 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Produit</p>
            <div className="space-y-1.5">
              {COMMODITIES.map((c) => (
                <button key={c.key} onClick={() => { setCommodity(c.key); setSelectedRegion(null); }}
                  className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left",
                    commodity === c.key ? "text-white" : "text-gray-600 hover:bg-gray-50")}
                  style={commodity === c.key ? { background: c.color } : {}}>
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: commodity === c.key ? "rgba(255,255,255,0.5)" : c.color }} />
                  <span className="flex-1">{c.label}</span>
                  {commodity === c.key && (
                    <span className="text-xs font-normal opacity-80">Seuil : {c.seuil}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Statistiques globales */}
          <div className="p-5 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Statistiques</p>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {[
                  { label: "Moyenne nationale",    value: `${avgPrice} CFA/kg`,    icon: Database, color: "text-gray-700" },
                  { label: "Région la + chère",   value: maxRegion ? `${maxPrice} CFA/kg\n${maxRegion.region}` : "—", icon: TrendingUp,   color: "text-[#E04E2F]" },
                  { label: "Région la + abordable",value: minRegion ? `${minPrice} CFA/kg\n${minRegion.region}` : "—", icon: TrendingDown, color: "text-[#16A34A]" },
                  { label: "Régions > seuil",     value: `${aboveSeuil} / ${regionPrices.length}`, icon: AlertTriangle, color: aboveSeuil > 0 ? "text-[#E04E2F]" : "text-gray-500" },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
                    <Icon className={cn("w-4 h-4 shrink-0", color)} />
                    <div>
                      <p className="text-[10px] text-gray-400">{label}</p>
                      <p className={cn("text-xs font-bold whitespace-pre-line", color)}>{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Région sélectionnée */}
          {selectedRegion && (
            <div className="p-5 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Région sélectionnée
              </p>
              <div className="bg-[#1A2C42] rounded-xl p-4 text-white">
                <p className="font-bold text-base mb-1">{selectedRegion}</p>
                {selectedData ? (
                  <>
                    <div className="flex items-baseline gap-1.5 mt-2">
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
                    <p className="text-xs text-white/50 mt-1">
                      Seuil : {activeCommodity.seuil} CFA/kg
                      {selectedData.price > activeCommodity.seuil
                        ? ` — dépassé de ${Math.round(((selectedData.price - activeCommodity.seuil) / activeCommodity.seuil) * 100)}%`
                        : ` — ${Math.round(((activeCommodity.seuil - selectedData.price) / activeCommodity.seuil) * 100)}% sous le seuil`}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-white/50 mt-2">Pas de données disponibles</p>
                )}
                <button onClick={() => setSelectedRegion(null)}
                  className="mt-3 text-[10px] text-white/40 hover:text-white/70 transition-colors">
                  ✕ Désélectionner
                </button>
              </div>
            </div>
          )}

          {/* Tableau des prix */}
          <div className="p-5 flex-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Prix par région
            </p>
            <div className="space-y-1">
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-9 bg-gray-100 rounded-lg animate-pulse" />
                  ))
                : ALL_REGIONS.map((region) => {
                    const rp = regionPrices.find((p) => p.region === region);
                    const price = rp?.price ?? 0;
                    const ratio = price ? price / activeCommodity.seuil : 0;
                    const isSelected = selectedRegion === region;

                    return (
                      <button key={region}
                        onClick={() => setSelectedRegion(isSelected ? null : region)}
                        className={cn("w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all",
                          isSelected ? "bg-[#1A2C42]/10 ring-1 ring-[#1A2C42]/20" : "hover:bg-gray-50")}>
                        <span className="w-3 h-3 rounded-full shrink-0"
                          style={{ background: price ? (ratio > 1.05 ? "#DC2626" : ratio > 0.95 ? "#F97316" : "#16A34A") : "#E5E7EB" }} />
                        <span className="flex-1 text-left text-gray-700 truncate">{region}</span>
                        <span className={cn("text-xs font-bold tabular-nums",
                          price > activeCommodity.seuil ? "text-[#E04E2F]" : "text-gray-600")}>
                          {price ? `${price}` : "—"}
                        </span>
                      </button>
                    );
                  })}
            </div>
          </div>
        </aside>

        {/* ── Carte ── */}
        <div className="flex-1 flex flex-col min-h-[500px] lg:min-h-0">

          {/* Légende */}
          <div className="bg-white border-b border-gray-100 px-4 py-2.5 flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
              <Info className="w-3.5 h-3.5" />
              Échelle relative au seuil ({activeCommodity.seuil} CFA/kg) :
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {LEGEND.map(({ label, color, desc }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className="w-3.5 h-3.5 rounded-sm shrink-0" style={{ background: color, border: "1px solid rgba(0,0,0,0.1)" }} />
                  <span className="text-[10px] text-gray-500">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Conteneur carte */}
          <div className="flex-1 relative p-4">
            <div className="w-full h-full min-h-[400px] rounded-2xl overflow-hidden shadow-sm border border-gray-100">
              <ChoroplethPrix
                prices={regionPrices}
                commodity={commodity}
                seuil={activeCommodity.seuil}
                unit="CFA/kg"
                onRegionClick={(region) => setSelectedRegion(region)}
              />
            </div>

            {/* Indicateur chargement */}
            {isLoading && (
              <div className="absolute inset-4 flex items-center justify-center bg-white/70 rounded-2xl backdrop-blur-sm">
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <RefreshCw className="w-5 h-5 animate-spin text-[#E04E2F]" />
                  Chargement des prix…
                </div>
              </div>
            )}

            {/* Attribution source */}
            <div className="absolute bottom-6 left-6 text-[10px] text-gray-400 bg-white/80 px-2 py-1 rounded-lg backdrop-blur-sm">
              Données WFP VAM / SONAGESS · Carte approximative
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
