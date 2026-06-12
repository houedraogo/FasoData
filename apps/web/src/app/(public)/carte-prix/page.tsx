"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import {
  MapPin, TrendingUp, TrendingDown, AlertTriangle,
  RefreshCw, Info, Database, Globe, BarChart3,
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const ChoroplethPrix = dynamic(
  () => import("@/components/maps/ChoroplethPrix"),
  { ssr: false, loading: () => <div className="w-full h-full bg-gray-100 rounded-2xl animate-pulse" /> }
);

// ── Config ────────────────────────────────────────────────────────────────────

const COMMODITIES = [
  { key: "sorghum",    label: "Sorgho",    color: "#E04E2F", seuil: 320 },
  { key: "rice_imported", label: "Riz importé", color: "#1A2C42", seuil: 500 },
  { key: "maize",      label: "Maïs",      color: "#16A34A", seuil: 300 },
  { key: "millet",     label: "Mil",       color: "#D97706", seuil: 350 },
  { key: "cowpea",     label: "Niébé",     color: "#8B5CF6", seuil: 650 },
  { key: "groundnut",  label: "Arachide",  color: "#0EA5E9", seuil: 650 },
];

const ALL_REGIONS = [
  "Sahel","Est","Nord","Centre-Nord","Boucle du Mouhoun",
  "Centre","Plateau Central","Centre-Est","Centre-Ouest",
  "Centre-Sud","Hauts-Bassins","Cascades","Sud-Ouest",
];

const LEGEND = [
  { label: "< 70% du seuil",  color: "#166534" },
  { label: "70–85%",          color: "#16A34A" },
  { label: "85–95%",          color: "#86EFAC" },
  { label: "95–105%",         color: "#FDE68A" },
  { label: "105–115%",        color: "#F97316" },
  { label: "> 115% du seuil", color: "#DC2626" },
  { label: "Pas de données",  color: "#E5E7EB" },
];

const COUNTRY_CFG: Record<string, { name: string; flag: string; color: string }> = {
  BFA: { name: "Burkina Faso", flag: "🇧🇫", color: "#E04E2F" },
  MLI: { name: "Mali",          flag: "🇲🇱", color: "#1A2C42" },
  NER: { name: "Niger",         flag: "🇳🇪", color: "#D97706" },
};

type Tab = "carte" | "comparaison";

interface LatestPrice { id: string; commodity: string; region: string; price: number; price_date: string; unit: string; }
interface CountryPrice { country: string; name: string; color: string; price: number | null; price_date: string | null; unit: string; }
interface CompareData {
  commodity: string; commodity_label: string; region: string;
  current_prices: CountryPrice[];
  series: ({ year: number; BFA?: number; MLI?: number; NER?: number })[];
  stats: { most_expensive: CountryPrice | null; cheapest: CountryPrice | null; spread_pct: number; countries_count: number };
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function CartePrixPage() {
  const [activeTab, setActiveTab]         = useState<Tab>("carte");
  const [commodity, setCommodity]         = useState("sorghum");
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  const activeCommodity = COMMODITIES.find((c) => c.key === commodity) ?? COMMODITIES[0];

  // ── Onglet Carte — prix BFA par région ───────────────────────────────────

  const { data: latestData, isLoading: loadingMap, isFetching: fetchingMap, refetch } = useQuery<LatestPrice[]>({
    queryKey: ["carte-prix-bfa", commodity],
    queryFn: async () => {
      const results = await Promise.allSettled(
        ALL_REGIONS.map((region) =>
          api.get(`/prices/latest?region=${encodeURIComponent(region)}&country=BFA`)
            .then(({ data }) => data as LatestPrice[])
            .catch(() => [] as LatestPrice[])
        )
      );
      const allPrices: LatestPrice[] = [];
      results.forEach((r) => { if (r.status === "fulfilled") allPrices.push(...r.value); });
      return allPrices;
    },
    staleTime: 5 * 60_000,
    enabled: activeTab === "carte",
  });

  const regionPrices = useMemo(() => {
    if (!latestData) return [];
    return latestData.filter((p) => p.commodity === commodity)
      .map((p) => ({ region: p.region, price: p.price, commodity: p.commodity }));
  }, [latestData, commodity]);

  const prices     = regionPrices.map((p) => p.price).filter((v) => v > 0);
  const maxPrice   = prices.length ? Math.max(...prices) : 0;
  const minPrice   = prices.length ? Math.min(...prices) : 0;
  const avgPrice   = prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
  const aboveSeuil = regionPrices.filter((p) => p.price > activeCommodity.seuil).length;
  const maxRegion  = regionPrices.find((p) => p.price === maxPrice);
  const minRegion  = regionPrices.find((p) => p.price === minPrice);
  const selectedData = selectedRegion ? regionPrices.find((p) => p.region === selectedRegion) : null;
  const mapHasNoData = !loadingMap && regionPrices.length === 0;

  // ── Onglet Comparaison ───────────────────────────────────────────────────

  const { data: compareData, isLoading: loadingCompare, isError: compareError, isFetching: fetchingCompare, refetch: refetchCompare } = useQuery<CompareData>({
    queryKey: ["prix-compare", commodity],
    queryFn: async () => {
      const { data } = await api.get(`/prices/compare-overview?commodity=${commodity}&region=National`);
      return data;
    },
    staleTime: 10 * 60_000,
    enabled: activeTab === "comparaison",
  });

  // ── Rendu ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex flex-col">

      {/* En-tête */}
      <header className="bg-[#1A2C42] px-4 sm:px-8 py-4">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#E04E2F] rounded-xl flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg leading-tight">Carte des prix alimentaires</h1>
              <p className="text-white/50 text-xs">Burkina Faso · Mali · Niger · sources publiques HDX/WFP</p>
            </div>
          </div>
          <button onClick={() => refetch()}
            className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <RefreshCw className={cn("w-4 h-4", fetchingMap && "animate-spin")} />
          </button>
        </div>

        {/* Onglets */}
        <div className="flex gap-1">
          {([
            { key: "carte" as Tab,       label: "🗺️ Carte Burkina",         icon: MapPin },
            { key: "comparaison" as Tab, label: "🌍 Comparaison inter-pays", icon: Globe },
          ] as const).map(({ key, label }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={cn(
                "px-4 py-2 rounded-t-xl text-xs font-semibold transition-colors",
                activeTab === key ? "bg-white text-[#1A2C42]" : "text-white/60 hover:text-white hover:bg-white/10"
              )}>
              {label}
            </button>
          ))}
        </div>
      </header>

      {/* ── ONGLET CARTE ─────────────────────────────────────────────────────── */}
      {activeTab === "carte" && (
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">

          {/* Panneau gauche */}
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
                    <span className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: commodity === c.key ? "rgba(255,255,255,0.5)" : c.color }} />
                    <span className="flex-1">{c.label}</span>
                    {commodity === c.key && <span className="text-xs opacity-80">Seuil : {c.seuil}</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="p-5 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Statistiques</p>
              {loadingMap ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}
                </div>
              ) : mapHasNoData ? (
                <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-3 py-6 text-center">
                  <Database className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                  <p className="text-sm font-medium text-gray-600">Aucun prix vérifié disponible</p>
                  <p className="mt-1 text-xs text-gray-400">Aucune observation publique ou terrain validée pour ce produit.</p>
                  <button
                    onClick={() => refetch()}
                    className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-[#E04E2F] hover:underline"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Réessayer
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {[
                    { label: "Moyenne nationale",     value: `${avgPrice} CFA/kg`, icon: Database, color: "text-gray-700" },
                    { label: "Région la + chère",     value: maxRegion ? `${maxPrice} CFA/kg\n${maxRegion.region}` : "—", icon: TrendingUp, color: "text-[#E04E2F]" },
                    { label: "Région la + abordable", value: minRegion ? `${minPrice} CFA/kg\n${minRegion.region}` : "—", icon: TrendingDown, color: "text-[#16A34A]" },
                    { label: "Régions > seuil",       value: `${aboveSeuil} / ${regionPrices.length}`, icon: AlertTriangle, color: aboveSeuil > 0 ? "text-[#E04E2F]" : "text-gray-500" },
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
                <div className="bg-[#1A2C42] rounded-xl p-4 text-white">
                  <p className="font-bold text-base mb-1">{selectedRegion}</p>
                  {selectedData ? (
                    <>
                      <div className="flex items-baseline gap-1.5 mt-2">
                        <span className="text-2xl font-bold" style={{ color: "#F5A623" }}>{selectedData.price}</span>
                        <span className="text-sm text-white/60">CFA/kg</span>
                      </div>
                      <div className="mt-2 h-1.5 bg-white/20 rounded-full overflow-hidden">
                        <div className="h-full rounded-full"
                          style={{ width: `${Math.min((selectedData.price / (activeCommodity.seuil * 1.3)) * 100, 100)}%`, background: selectedData.price > activeCommodity.seuil ? "#E04E2F" : "#16A34A" }} />
                      </div>
                      <p className="text-xs text-white/50 mt-1">
                        {selectedData.price > activeCommodity.seuil
                          ? `Seuil dépassé de ${Math.round(((selectedData.price - activeCommodity.seuil) / activeCommodity.seuil) * 100)}%`
                          : `${Math.round(((activeCommodity.seuil - selectedData.price) / activeCommodity.seuil) * 100)}% sous le seuil`}
                      </p>
                    </>
                  ) : <p className="text-sm text-white/50 mt-2">Pas de données</p>}
                  <button onClick={() => setSelectedRegion(null)} className="mt-3 text-[10px] text-white/40 hover:text-white/70">✕ Désélectionner</button>
                </div>
              </div>
            )}

            {/* Tableau régions */}
            <div className="p-5 flex-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Prix par région</p>
              <div className="space-y-1">
                {loadingMap
                  ? Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-9 bg-gray-100 rounded-lg animate-pulse" />)
                  : mapHasNoData ? (
                    <div className="rounded-xl border border-dashed border-gray-200 px-3 py-6 text-center text-xs text-gray-400">
                      Les régions apparaîtront après ingestion de prix vérifiés.
                    </div>
                  )
                  : ALL_REGIONS.map((region) => {
                    const rp = regionPrices.find((p) => p.region === region);
                    const price = rp?.price ?? 0;
                    const ratio = price ? price / activeCommodity.seuil : 0;
                    const isSelected = selectedRegion === region;
                    return (
                      <button key={region} onClick={() => setSelectedRegion(isSelected ? null : region)}
                        className={cn("w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all",
                          isSelected ? "bg-[#1A2C42]/10 ring-1 ring-[#1A2C42]/20" : "hover:bg-gray-50")}>
                        <span className="w-3 h-3 rounded-full shrink-0"
                          style={{ background: price ? (ratio > 1.05 ? "#DC2626" : ratio > 0.95 ? "#F97316" : "#16A34A") : "#E5E7EB" }} />
                        <span className="flex-1 text-left text-gray-700 truncate">{region}</span>
                        <span className={cn("text-xs font-bold tabular-nums", price > activeCommodity.seuil ? "text-[#E04E2F]" : "text-gray-600")}>
                          {price ? `${price}` : "—"}
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>
          </aside>

          {/* Carte */}
          <div className="flex-1 flex flex-col min-h-[500px] lg:min-h-0">
            <div className="bg-white border-b border-gray-100 px-4 py-2.5 flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                <Info className="w-3.5 h-3.5" /> Échelle / seuil {activeCommodity.seuil} CFA/kg :
              </div>
              {LEGEND.map(({ label, color }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className="w-3.5 h-3.5 rounded-sm shrink-0" style={{ background: color, border: "1px solid rgba(0,0,0,0.1)" }} />
                  <span className="text-[10px] text-gray-500">{label}</span>
                </div>
              ))}
            </div>
            <div className="flex-1 relative p-4">
              <div className="w-full h-full min-h-[400px] rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                <ChoroplethPrix prices={regionPrices} commodity={commodity} seuil={activeCommodity.seuil} unit="CFA/kg" onRegionClick={setSelectedRegion} />
              </div>
              {loadingMap && (
                <div className="absolute inset-4 flex items-center justify-center bg-white/70 rounded-2xl backdrop-blur-sm">
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <RefreshCw className="w-5 h-5 animate-spin text-[#E04E2F]" /> Chargement…
                  </div>
                </div>
              )}
              {mapHasNoData && (
                <div className="absolute inset-4 flex items-center justify-center bg-white/80 rounded-2xl backdrop-blur-sm">
                  <div className="max-w-sm rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-5 text-center shadow-sm">
                    <Database className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                    <p className="text-sm font-semibold text-gray-700">Carte sans données pour {activeCommodity.label}</p>
                    <p className="mt-1 text-xs text-gray-400">Changez de produit ou relancez le chargement.</p>
                    <button
                      onClick={() => refetch()}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#1A2C42] px-4 py-2 text-xs font-semibold text-white hover:bg-[#223a57]"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Réessayer
                    </button>
                  </div>
                </div>
              )}
              <div className="absolute bottom-6 left-6 text-[10px] text-gray-400 bg-white/80 px-2 py-1 rounded-lg backdrop-blur-sm">
                Source publique HDX/WFP · Burkina Faso
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ONGLET COMPARAISON ────────────────────────────────────────────────── */}
      {activeTab === "comparaison" && (
        <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto">

          {/* Sélecteur produit horizontal */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-semibold text-gray-600">Produit :</span>
            {COMMODITIES.map((c) => (
              <button key={c.key} onClick={() => setCommodity(c.key)}
                className={cn("px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors",
                  commodity === c.key ? "text-white border-transparent" : "border-gray-200 text-gray-600 hover:border-gray-300")}
                style={commodity === c.key ? { background: c.color } : {}}>
                {c.label}
              </button>
            ))}
          </div>

          {loadingCompare ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-32 bg-white rounded-2xl border border-gray-100 animate-pulse" />)}
            </div>
          ) : compareError ? (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center text-gray-400">
              <AlertTriangle className="w-12 h-12 mb-3 text-amber-300" />
              <p className="font-semibold text-gray-700">Comparaison indisponible</p>
              <p className="mt-1 text-sm">Les données publiques WFP inter-pays n'ont pas pu être chargées.</p>
              <button
                onClick={() => refetchCompare()}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#1A2C42] px-4 py-2 text-xs font-semibold text-white hover:bg-[#223a57]"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", fetchingCompare && "animate-spin")} />
                Réessayer
              </button>
            </div>
          ) : compareData ? (
            <>
              {/* KPIs pays */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {compareData.current_prices.map((cp) => {
                  const cfg = COUNTRY_CFG[cp.country] ?? { flag: "🌍", name: cp.country, color: cp.color };
                  const isMostExp  = cp.country === compareData.stats.most_expensive?.country;
                  const isCheapest = cp.country === compareData.stats.cheapest?.country;
                  return (
                    <div key={cp.country} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{cfg.flag}</span>
                          <div>
                            <p className="font-bold text-gray-900 text-sm">{cfg.name}</p>
                            <p className="text-xs text-gray-400">{cp.country}</p>
                          </div>
                        </div>
                        {isMostExp && <span className="text-[10px] bg-red-50 text-[#E04E2F] font-bold px-2 py-0.5 rounded-full">Le + cher</span>}
                        {isCheapest && <span className="text-[10px] bg-green-50 text-[#16A34A] font-bold px-2 py-0.5 rounded-full">Le - cher</span>}
                      </div>
                      {cp.price != null ? (
                        <>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-3xl font-bold" style={{ color: cp.color }}>{cp.price}</span>
                            <span className="text-sm text-gray-400">CFA/kg</span>
                          </div>
                          <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{
                              width: `${Math.min((cp.price / (activeCommodity.seuil * 1.5)) * 100, 100)}%`,
                              background: cp.color,
                            }} />
                          </div>
                          <p className="text-[10px] text-gray-400 mt-1">
                            Seuil {activeCommodity.seuil} CFA/kg ·{" "}
                            <span className={cp.price > activeCommodity.seuil ? "text-[#E04E2F] font-semibold" : "text-[#16A34A] font-semibold"}>
                              {cp.price > activeCommodity.seuil
                                ? `+${Math.round(((cp.price - activeCommodity.seuil) / activeCommodity.seuil) * 100)}%`
                                : `-${Math.round(((activeCommodity.seuil - cp.price) / activeCommodity.seuil) * 100)}%`}
                            </span>
                          </p>
                        </>
                      ) : (
                        <p className="text-gray-400 text-sm mt-2">Pas de données</p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Bandeau écart */}
              {compareData.stats.spread_pct > 0 && (
                <div className="bg-[#1A2C42] rounded-2xl p-4 flex items-center gap-4 flex-wrap">
                  <BarChart3 className="w-5 h-5 text-white/60 shrink-0" />
                  <p className="text-white text-sm flex-1">
                    <strong className="text-[#F5A623]">Écart de prix : {compareData.stats.spread_pct}%</strong>
                    {" "}entre {compareData.stats.cheapest?.name} ({compareData.stats.cheapest?.price} CFA/kg)
                    et {compareData.stats.most_expensive?.name} ({compareData.stats.most_expensive?.price} CFA/kg)
                    pour <em>{compareData.commodity_label}</em> au niveau national.
                  </p>
                  <span className="text-xs text-white/40">Source HDX/WFP · {new Date().getFullYear()}</span>
                </div>
              )}

              {/* Graphique barres — comparaison actuelle */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-1 h-4 rounded-full" style={{ background: activeCommodity.color }} />
                  <h2 className="font-bold text-gray-900 text-sm">
                    Prix actuels — {compareData.commodity_label} · Niveau national
                  </h2>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={compareData.current_prices.filter((cp) => cp.price != null).map((cp) => ({
                      name: `${COUNTRY_CFG[cp.country]?.flag ?? ""} ${COUNTRY_CFG[cp.country]?.name ?? cp.country}`,
                      prix: cp.price,
                      color: cp.color,
                    }))}
                    margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E5E7EB" }}
                      formatter={(v: number) => [`${v} CFA/kg`, "Prix"]} />
                    <ReferenceLine y={activeCommodity.seuil} stroke="#E04E2F" strokeDasharray="4 4"
                      label={{ value: `Seuil ${activeCommodity.seuil}`, fontSize: 10, fill: "#E04E2F" }} />
                    <Bar dataKey="prix" radius={[6, 6, 0, 0]} barSize={60}
                      fill={activeCommodity.color}
                      label={{ position: "top", fontSize: 11, fill: "#374151", formatter: (v: number) => `${v}` }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Graphique ligne — évolution 2020→présent */}
              {compareData.series.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="w-1 h-4 rounded-full bg-[#1A2C42]" />
                    <h2 className="font-bold text-gray-900 text-sm">
                      Évolution annuelle — {compareData.commodity_label} (2020 → présent)
                    </h2>
                    <span className="text-xs text-gray-400 ml-1">CFA/kg · National</span>
                  </div>
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={compareData.series} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E5E7EB" }}
                        formatter={(v: number, name: string) => [`${Math.round(v)} CFA/kg`, name]} />
                      <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                      <ReferenceLine y={activeCommodity.seuil} stroke="#E04E2F" strokeDasharray="4 4"
                        label={{ value: `Seuil`, fontSize: 10, fill: "#E04E2F" }} />
                      {(["BFA", "MLI", "NER"] as const).map((country) => (
                        <Line key={country} type="monotone" dataKey={country}
                          name={`${COUNTRY_CFG[country].flag} ${COUNTRY_CFG[country].name}`}
                          stroke={COUNTRY_CFG[country].color} strokeWidth={2.5}
                          dot={{ r: 3, fill: COUNTRY_CFG[country].color }}
                          connectNulls />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Source */}
              <p className="text-xs text-gray-400 text-right">
                Source : HDX/WFP Food Prices · données publiques et séries FasoData validées
              </p>
            </>
          ) : (
            <div className="flex flex-col items-center py-20 text-gray-400">
              <Globe className="w-12 h-12 mb-3 opacity-30" />
              <p>Aucune donnée vérifiée de comparaison disponible</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
