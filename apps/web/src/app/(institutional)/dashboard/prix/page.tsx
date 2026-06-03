"use client";

import { useState, useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import {
  TrendingUp, TrendingDown, Table2, BarChart3,
  Download, MessageSquare, Smartphone, Wifi, RefreshCw,
  LayoutGrid, MapPin, Globe,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SeriesPoint { period: string; price: number; min: number; max: number; n_obs: number; sources?: Record<string, number>; }
interface PriceSeries { commodity: string; region: string; granularity: string; unit: string; source?: string; sources?: string[]; points: SeriesPoint[]; }

// ── Config produits ────────────────────────────────────────────────────────────

const ALL_COMMODITIES = [
  { key: "sorghum",    label: "Sorgho",    color: "#E04E2F", seuil: 320 },
  { key: "rice_local", label: "Riz local", color: "#1A2C42", seuil: 500 },
  { key: "maize",      label: "Maïs",      color: "#16A34A", seuil: 300 },
  { key: "millet",     label: "Mil",       color: "#D97706", seuil: 350 },
  { key: "cowpea",     label: "Niébé",     color: "#8B5CF6", seuil: 650 },
  { key: "groundnut",  label: "Arachide",  color: "#0EA5E9", seuil: 650 },
];

// ── Config régions ─────────────────────────────────────────────────────────────
// Chaque région a sa couleur propre (palette distincte)

const ALL_REGIONS = [
  { key: "National",      label: "National",       color: "#64748B" },
  { key: "Sahel",         label: "Sahel",           color: "#E04E2F" },
  { key: "Centre",        label: "Centre",          color: "#1A2C42" },
  { key: "Hauts-Bassins", label: "Hauts-Bassins",   color: "#16A34A" },
  { key: "Est",           label: "Est",             color: "#D97706" },
  { key: "Nord",          label: "Nord",            color: "#8B5CF6" },
  { key: "Centre-Nord",   label: "Centre-Nord",     color: "#0EA5E9" },
  { key: "Cascades",      label: "Cascades",        color: "#F97316" },
];

const MOIS_FR: Record<string, string> = {
  "01":"Jan","02":"Fév","03":"Mar","04":"Avr","05":"Mai","06":"Jun",
  "07":"Jul","08":"Aoû","09":"Sep","10":"Oct","11":"Nov","12":"Déc",
};

function formatPeriod(p: string, g: string) {
  if (g === "yearly") return p;
  const [y, m] = p.split("-");
  return `${MOIS_FR[m] ?? m} ${y}`;
}

const COMMODITY_LABELS_FR: Record<string, string> = Object.fromEntries(
  ALL_COMMODITIES.map((c) => [c.key, c.label])
);

// ── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, current, previous, color }: { label: string; current: number; previous: number; color: string }) {
  const pct = previous > 0 ? ((current - previous) / previous) * 100 : 0;
  const up  = pct >= 0;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">{label}</p>
      <div className="flex items-baseline gap-1 mb-2">
        <span className="text-3xl font-bold text-gray-900">{current}</span>
        <span className="text-sm text-gray-400 ml-1">CFA/kg</span>
      </div>
      <div className={cn("flex items-center gap-1 text-xs font-semibold", up ? "text-[#16A34A]" : "text-[#E04E2F]")}>
        {up ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
        {up ? "+" : ""}{pct.toFixed(1)}% vs période préc.
      </div>
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────

// ── Config pays ─────────────────────────────────────────────────────────────

const ALL_COUNTRIES = [
  { key: "BFA", label: "Burkina Faso", flag: "🇧🇫", color: "#E04E2F", capital: "Ouagadougou" },
  { key: "MLI", label: "Mali",          flag: "🇲🇱", color: "#1A2C42", capital: "Bamako" },
  { key: "NER", label: "Niger",         flag: "🇳🇪", color: "#D97706", capital: "Niamey" },
];

type Mode        = "commodities" | "regions" | "countries";
type Granularity = "monthly" | "yearly";
type ChartType   = "area" | "line" | "bar";
type Tab         = "chart" | "table";

export default function PrixPage() {
  // ── Modes & sélections ────────────────────────────────────────────────────
  const [mode, setMode]             = useState<Mode>("commodities");
  const [granularity, setGranularity] = useState<Granularity>("monthly");
  const [startYear, setStartYear]   = useState("2022");
  const [chartType, setChartType]   = useState<ChartType>("area");
  const [tab, setTab]               = useState<Tab>("chart");

  // Mode "produits" : 1 région, N produits
  const [region, setRegion]           = useState("National");
  const [selectedKeys, setSelectedKeys] = useState(["sorghum", "rice_local"]);
  const activeCommodities = ALL_COMMODITIES.filter((c) => selectedKeys.includes(c.key));

  const toggleCommodity = (key: string) =>
    setSelectedKeys((prev) =>
      prev.includes(key)
        ? prev.length > 1 ? prev.filter((k) => k !== key) : prev
        : [...prev, key]
    );

  // Mode "régions" : 1 produit, N régions
  const [commodity, setCommodity]         = useState("sorghum");
  const [selectedRegions, setSelectedRegions] = useState(["National", "Sahel", "Hauts-Bassins"]);
  const activeRegions = ALL_REGIONS.filter((r) => selectedRegions.includes(r.key));

  const toggleRegion = (key: string) =>
    setSelectedRegions((prev) =>
      prev.includes(key)
        ? prev.length > 1 ? prev.filter((k) => k !== key) : prev
        : prev.length < 6 ? [...prev, key] : prev  // max 6 régions simultanées
    );

  const activeCommodity = ALL_COMMODITIES.find((c) => c.key === commodity) ?? ALL_COMMODITIES[0];

  // Mode "pays" : 1 produit, N pays (max 3)
  const [commodityForCountries, setCommodityForCountries] = useState("sorghum");
  const [selectedCountries, setSelectedCountries] = useState(["BFA", "MLI", "NER"]);
  const activeCountries = ALL_COUNTRIES.filter((c) => selectedCountries.includes(c.key));

  const toggleCountry = (key: string) =>
    setSelectedCountries((prev) =>
      prev.includes(key)
        ? prev.length > 1 ? prev.filter((k) => k !== key) : prev
        : prev.length < 3 ? [...prev, key] : prev
    );

  // ── Paramètre commun ──────────────────────────────────────────────────────
  const start = granularity === "monthly" ? `${startYear}-01` : undefined;

  // ── useQueries — mode "produits" ──────────────────────────────────────────
  const commodityResults = useQueries({
    queries: ALL_COMMODITIES.map((c) => ({
      queryKey: ["prices", c.key, region, granularity, startYear],
      queryFn: async (): Promise<PriceSeries> => {
        const p = new URLSearchParams({ commodity: c.key, region, granularity, ...(start && { start }) });
        const { data } = await api.get(`/prices/series?${p}`);
        return data;
      },
      enabled: mode === "commodities",
    })),
  });

  // ── useQueries — mode "régions" ────────────────────────────────────────────
  const regionResults = useQueries({
    queries: ALL_REGIONS.map((r) => ({
      queryKey: ["prices", commodity, r.key, granularity, startYear],
      queryFn: async (): Promise<PriceSeries> => {
        const p = new URLSearchParams({ commodity, region: r.key, granularity, ...(start && { start }) });
        const { data } = await api.get(`/prices/series?${p}`);
        return data;
      },
      enabled: mode === "regions",
    })),
  });

  // ── Query — mode "pays" ───────────────────────────────────────────────────
  const { data: countryCompare, isLoading: countryLoading } = useQuery({
    queryKey: ["prices-compare", commodityForCountries, selectedCountries.join(","), granularity, startYear],
    queryFn: async () => {
      const p = new URLSearchParams({
        commodity: commodityForCountries,
        countries: selectedCountries.join(","),
        granularity,
        ...(start && { start }),
      });
      const { data } = await api.get(`/prices/compare?${p}`);
      return data as {
        commodity: string; label: string; granularity: string;
        countries: Array<{ country: string; country_name: string; capital: string; color: string; points: { period: string; price: number }[] }>;
      };
    },
    enabled: mode === "countries",
  });

  // Fusionner les séries pays pour le graphique
  const countryMap = useMemo(() => {
    if (!countryCompare) return [];
    const map: Record<string, Record<string, string | number>> = {};
    countryCompare.countries.forEach((cs) => {
      cs.points.forEach((p) => {
        if (!map[p.period]) map[p.period] = { period: p.period };
        map[p.period][cs.country] = p.price;
      });
    });
    return Object.values(map).sort((a, b) => String(a.period).localeCompare(String(b.period)));
  }, [countryCompare]);

  const loading = mode === "commodities"
    ? commodityResults.some((r) => r.isLoading)
    : mode === "regions"
    ? regionResults.some((r) => r.isLoading)
    : countryLoading;

  // ── Maps de séries ────────────────────────────────────────────────────────
  const commodityMap = useMemo(() => {
    const m: Record<string, PriceSeries | undefined> = {};
    ALL_COMMODITIES.forEach((c, i) => { m[c.key] = commodityResults[i]?.data; });
    return m;
  }, [commodityResults]);

  const regionMap = useMemo(() => {
    const m: Record<string, PriceSeries | undefined> = {};
    ALL_REGIONS.forEach((r, i) => { m[r.key] = regionResults[i]?.data; });
    return m;
  }, [regionResults]);

  // ── Données fusionnées pour le graphique ──────────────────────────────────
  const combined = useMemo(() => {
    if (mode === "countries") return countryMap;

    const map: Record<string, Record<string, string | number>> = {};

    if (mode === "commodities") {
      activeCommodities.forEach((c) => {
        commodityMap[c.key]?.points.forEach((p) => {
          if (!map[p.period]) map[p.period] = { period: p.period };
          map[p.period][c.key] = p.price;
        });
      });
    } else {
      activeRegions.forEach((r) => {
        regionMap[r.key]?.points.forEach((p) => {
          if (!map[p.period]) map[p.period] = { period: p.period };
          map[p.period][r.key] = p.price;
        });
      });
    }

    return Object.values(map).sort((a, b) => String(a.period).localeCompare(String(b.period)));
  }, [mode, commodityMap, regionMap, selectedKeys, selectedRegions]);

  // ── Lignes actives (pour les graphiques Recharts) ─────────────────────────
  const activeLines = mode === "commodities"
    ? activeCommodities.map((c) => ({ key: c.key, label: c.label, color: c.color }))
    : mode === "regions"
    ? activeRegions.map((r) => ({ key: r.key, label: r.label, color: r.color }))
    : activeCountries.map((c) => ({ key: c.key, label: `${c.flag} ${c.label}`, color: c.color }));

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpiItems = (mode === "commodities" ? activeCommodities.slice(0, 4) : activeRegions.slice(0, 4)).map((item) => {
    const series = mode === "commodities"
      ? commodityMap[item.key]
      : regionMap[item.key];
    const last = series?.points.at(-1);
    const prev = series?.points.at(-2);
    return { ...item, current: last?.price ?? 0, previous: prev?.price ?? 0 };
  });

  // ── Variation annuelle sorgho (tableau onglet chart) ───────────────────────
  const annualData = useMemo(() => {
    const targetSeries = mode === "commodities"
      ? commodityMap["sorghum"]
      : regionMap[selectedRegions[0]];
    if (!targetSeries?.points.length) return [];
    const yearly: Record<string, number[]> = {};
    targetSeries.points.forEach((p) => {
      const y = p.period.substring(0, 4);
      yearly[y] = [...(yearly[y] ?? []), p.price];
    });
    return Object.entries(yearly)
      .map(([yr, prices]) => ({ year: yr, value: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) }))
      .sort((a, b) => a.year.localeCompare(b.year));
  }, [mode, commodityMap, regionMap, selectedRegions]);

  // ── Seuils du graphique ───────────────────────────────────────────────────
  const activeCommodityForSeuil = mode === "countries"
    ? ALL_COMMODITIES.find((c) => c.key === commodityForCountries) ?? ALL_COMMODITIES[0]
    : activeCommodity;

  const seuilLines = mode === "commodities"
    ? activeCommodities.map((c) => ({ label: `Seuil ${c.label} ${c.seuil}`, value: c.seuil, color: c.color }))
    : [{ label: `Seuil ${activeCommodityForSeuil.label} ${activeCommodityForSeuil.seuil}`, value: activeCommodityForSeuil.seuil, color: activeCommodityForSeuil.color }];

  // ── Export CSV ────────────────────────────────────────────────────────────
  const handleExport = () => {
    if (!combined.length) return;
    const cols   = activeLines.map((l) => `${l.label} (CFA/kg)`).join(",");
    const header = `Période,${cols}\n`;
    const rows   = combined.map((r) => {
      const vals = activeLines.map((l) => String(r[l.key] ?? "")).join(",");
      return `${String(r.period)},${vals}`;
    }).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = mode === "countries"
      ? `prix_${commodityForCountries}_inter-pays_${granularity}.csv`
      : `prix_${mode === "commodities" ? region : commodity}_${granularity}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tickFmt = (v: string) => formatPeriod(v, granularity);

  // ── Rendu graphique ───────────────────────────────────────────────────────
  const renderLines = () => activeLines.map((l) => (
    <Line key={l.key} type="monotone" dataKey={l.key} name={l.label}
      stroke={l.color} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
  ));

  const renderAreas = () => activeLines.map((l) => (
    <Area key={l.key} type="monotone" dataKey={l.key} name={l.label}
      stroke={l.color} strokeWidth={2} fill={`url(#g_${l.key.replace(/[^a-z0-9]/gi, "_")})`}
      dot={false} activeDot={{ r: 4 }} />
  ));

  const renderBars = () => activeLines.map((l) => (
    <Bar key={l.key} dataKey={l.key} name={l.label}
      fill={l.color} radius={[3, 3, 0, 0]} barSize={granularity === "yearly" ? 24 : 8} />
  ));

  const renderGradients = () => activeLines.map((l) => (
    <linearGradient key={l.key} id={`g_${l.key.replace(/[^a-z0-9]/gi, "_")}`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%"  stopColor={l.color} stopOpacity={0.14} />
      <stop offset="95%" stopColor={l.color} stopOpacity={0} />
    </linearGradient>
  ));

  const commonChart = {
    data: combined,
    margin: { top: 8, right: 16, left: -10, bottom: 0 },
  };
  const commonAxes = (
    <>
      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
      <XAxis dataKey="period" tickFormatter={tickFmt} tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
      <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
      <Tooltip formatter={(v: number) => [`${v} CFA/kg`]} labelFormatter={(l) => formatPeriod(String(l), granularity)} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
      <Legend wrapperStyle={{ fontSize: 11 }} />
      {seuilLines.map((s) => (
        <ReferenceLine key={s.label} y={s.value} stroke={s.color} strokeDasharray="4 2"
          label={{ value: `${s.value}`, fontSize: 9, fill: s.color }} />
      ))}
    </>
  );

  const renderChart = () => {
    if (chartType === "bar") return (
      <BarChart {...commonChart}>{commonAxes}{renderBars()}</BarChart>
    );
    if (chartType === "line") return (
      <LineChart {...commonChart}>{commonAxes}{renderLines()}</LineChart>
    );
    return (
      <AreaChart {...commonChart}>
        <defs>{renderGradients()}</defs>
        {commonAxes}{renderAreas()}
      </AreaChart>
    );
  };

  const titleLine = mode === "commodities"
    ? `Plusieurs produits — ${region}`
    : mode === "regions"
    ? `${COMMODITY_LABELS_FR[commodity] ?? commodity} — Comparaison régionale`
    : `${COMMODITY_LABELS_FR[commodityForCountries] ?? commodityForCountries} — ${activeCountries.map((c) => c.flag).join("")} Burkina vs Mali vs Niger`;

  return (
    <div className="p-6 lg:p-8 space-y-6">

      {/* ── En-tête ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Évolution des prix alimentaires</h1>
          <p className="text-gray-500 text-sm mt-1">
            Données WFP / SONAGESS · Burkina Faso · {titleLine}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Granularité */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
            {(["monthly", "yearly"] as Granularity[]).map((g) => (
              <button key={g} onClick={() => setGranularity(g)}
                className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                  granularity === g ? "bg-[#1A2C42] text-white" : "text-gray-500 hover:text-gray-700")}>
                {g === "monthly" ? "Mensuel" : "Annuel"}
              </button>
            ))}
          </div>

          {/* Année de début (mode mensuel) */}
          {granularity === "monthly" && (
            <select value={startYear} onChange={(e) => setStartYear(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1A2C42]/20">
              {["2020","2021","2022","2023","2024"].map((y) => <option key={y}>Depuis {y}</option>)}
            </select>
          )}

          <button onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm bg-white hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4" /> CSV
          </button>
        </div>
      </div>

      {/* ── Toggle mode + sélecteurs ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5">

        {/* Toggle mode */}
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Mode :</span>
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            {([
              { key: "commodities", icon: LayoutGrid, label: "Produits" },
              { key: "regions",     icon: MapPin,     label: "Régions" },
              { key: "countries",   icon: Globe,      label: "Pays" },
            ] as const).map(({ key, icon: Icon, label }) => (
              <button key={key} onClick={() => setMode(key)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  mode === key ? "bg-[#1A2C42] text-white shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}>
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </div>
        </div>

        {/* Sélecteurs selon le mode */}
        {mode === "countries" ? (
          <div className="space-y-3">
            {/* Produit unique */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Produit :</span>
              <div className="flex flex-wrap gap-1.5">
                {ALL_COMMODITIES.filter((c) => c.key !== "groundnut").map((c) => (
                  <button key={c.key} onClick={() => setCommodityForCountries(c.key)}
                    className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                      commodityForCountries === c.key ? "text-white border-transparent" : "bg-white text-gray-500 border-gray-200 hover:border-gray-300")}
                    style={commodityForCountries === c.key ? { background: c.color, borderColor: c.color } : {}}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sélecteur pays */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Pays :</span>
              <div className="flex flex-wrap gap-2">
                {ALL_COUNTRIES.map((c) => (
                  <button key={c.key} onClick={() => toggleCountry(c.key)}
                    className={cn("flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all",
                      selectedCountries.includes(c.key)
                        ? "text-white border-transparent shadow-sm"
                        : "bg-white text-gray-500 border-gray-200 hover:border-gray-300 opacity-60")}
                    style={selectedCountries.includes(c.key) ? { background: c.color, borderColor: c.color } : {}}>
                    <span className="text-base">{c.flag}</span>
                    <span>{c.label}</span>
                    <span className={cn("text-[10px] opacity-70", selectedCountries.includes(c.key) ? "text-white" : "text-gray-400")}>
                      {c.capital}
                    </span>
                  </button>
                ))}
              </div>
              <span className="text-xs text-gray-400">Max 3 pays</span>
            </div>

            {/* Contexte historique */}
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-700 flex items-start gap-2">
              <span className="shrink-0 mt-0.5">📌</span>
              <span>
                <strong>Niger (NER) :</strong> Coup d'état juillet 2023 → embargo CEDEAO → pic historique des prix août-sept 2023 ·
                <strong> Mali (MLI) :</strong> Instabilité sécuritaire 2021-2022 → hausse soutenue
              </span>
            </div>
          </div>
        ) : mode === "commodities" ? (
          <div className="space-y-3">
            {/* Région unique */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Région :</span>
              <div className="flex flex-wrap gap-1.5">
                {ALL_REGIONS.map((r) => (
                  <button key={r.key} onClick={() => setRegion(r.key)}
                    className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                      region === r.key ? "text-white border-transparent" : "bg-white text-gray-500 border-gray-200 hover:border-gray-300")}
                    style={region === r.key ? { background: r.color, borderColor: r.color } : {}}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Multi-produits */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Produits :</span>
              <div className="flex flex-wrap gap-1.5">
                {ALL_COMMODITIES.map((c) => (
                  <button key={c.key} onClick={() => toggleCommodity(c.key)}
                    className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                      selectedKeys.includes(c.key) ? "text-white border-transparent" : "bg-white text-gray-500 border-gray-200 hover:border-gray-300 opacity-50")}
                    style={selectedKeys.includes(c.key) ? { background: c.color, borderColor: c.color } : {}}>
                    {c.label}
                  </button>
                ))}
              </div>
              <span className="text-xs text-gray-400">Cliquez pour afficher/masquer</span>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Produit unique */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Produit :</span>
              <div className="flex flex-wrap gap-1.5">
                {ALL_COMMODITIES.map((c) => (
                  <button key={c.key} onClick={() => setCommodity(c.key)}
                    className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                      commodity === c.key ? "text-white border-transparent" : "bg-white text-gray-500 border-gray-200 hover:border-gray-300")}
                    style={commodity === c.key ? { background: c.color, borderColor: c.color } : {}}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Multi-régions */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Régions :</span>
              <div className="flex flex-wrap gap-1.5">
                {ALL_REGIONS.map((r) => (
                  <button key={r.key} onClick={() => toggleRegion(r.key)}
                    className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                      selectedRegions.includes(r.key) ? "text-white border-transparent" : "bg-white text-gray-500 border-gray-200 hover:border-gray-300 opacity-50")}
                    style={selectedRegions.includes(r.key) ? { background: r.color, borderColor: r.color } : {}}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                    {r.label}
                  </button>
                ))}
              </div>
              <span className="text-xs text-gray-400">Max 6 régions · Cliquez pour afficher/masquer</span>
            </div>
          </div>
        )}
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-pulse">
                <div className="h-3 bg-gray-100 rounded w-1/2 mb-4" />
                <div className="h-8 bg-gray-100 rounded w-2/3 mb-2" />
                <div className="h-3 bg-gray-50 rounded w-1/3" />
              </div>
            ))
          : kpiItems.map((item) => (
              <KpiCard key={item.key} label={item.label} current={item.current}
                previous={item.previous} color={item.color} />
            ))
        }
      </div>

      {/* ── Graphique principal ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-1 h-5 bg-[#E04E2F] rounded-full" />
            <h2 className="font-bold text-gray-900">
              {mode === "commodities"
                ? `Séries temporelles — ${region} — ${granularity === "monthly" ? "mensuel" : "annuel"}`
                : `${COMMODITY_LABELS_FR[commodity] ?? commodity} — ${granularity === "monthly" ? "mensuel" : "annuel"} — ${activeRegions.length} régions`}
            </h2>
          </div>
          <div className="flex items-center gap-1.5">
            {([
              { t: "area",  label: "Aire" },
              { t: "line",  label: "Ligne" },
              { t: "bar",   label: "Barres" },
            ] as const).map(({ t, label }) => (
              <button key={t} onClick={() => setChartType(t as ChartType)}
                className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                  chartType === t ? "bg-[#1A2C42] text-white border-[#1A2C42]" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300")}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="h-72 bg-gray-50 rounded-xl animate-pulse" />
        ) : combined.length === 0 ? (
          <div className="h-72 flex items-center justify-center text-gray-300">
            <div className="text-center">
              <BarChart3 className="w-10 h-10 mx-auto mb-3" />
              <p className="text-sm text-gray-400">Aucune donnée</p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>{renderChart()}</ResponsiveContainer>
        )}

        {/* Légende seuils */}
        <div className="flex items-center gap-4 mt-4 text-xs text-gray-500 flex-wrap">
          {seuilLines.map((s) => (
            <span key={s.label} className="flex items-center gap-1.5">
              <span className="w-5 h-0.5 border-t-2 border-dashed inline-block" style={{ borderColor: s.color }} />
              Seuil {s.value} CFA/kg
            </span>
          ))}
          <span className="text-gray-300 ml-auto">Source : WFP VAM / SONAGESS</span>
        </div>
      </div>

      {/* ── Onglets graphique annuel + tableau ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-100 px-4 pt-4">
          {([
            { key: "chart", icon: BarChart3, label: mode === "regions" ? "Par région — annuel" : "Évolution annuelle" },
            { key: "table", icon: Table2,    label: "Tableau détaillé" },
          ] as const).map(({ key, icon: Icon, label }) => (
            <button key={key} onClick={() => setTab(key)}
              className={cn("flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 mr-1 transition-colors",
                tab === key ? "border-[#1A2C42] text-[#1A2C42] bg-[#1A2C42]/5" : "border-transparent text-gray-500 hover:text-gray-700")}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {tab === "chart" ? (
            <>
              <p className="text-xs text-gray-500 mb-4">
                {mode === "commodities"
                  ? `Prix moyen annuel du Sorgho — ${region}`
                  : `Prix moyen annuel du ${COMMODITY_LABELS_FR[commodity] ?? commodity} — ${activeRegions.map((r) => r.label).join(", ")}`}
              </p>
              {loading ? (
                <div className="h-56 bg-gray-50 rounded-xl animate-pulse" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={annualData} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v: number) => [`${v} CFA/kg`, "Prix moyen"]} contentStyle={{ borderRadius: 8 }} />
                    <Bar dataKey="value" fill={mode === "commodities" ? "#E04E2F" : activeRegions[0]?.color ?? "#1A2C42"}
                      radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </>
          ) : (
            /* ── Tableau ── */
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    <th className="text-left px-4 py-3">Période</th>
                    {activeLines.map((l) => (
                      <th key={l.key} className="text-right px-4 py-3" style={{ color: l.color }}>
                        {l.label}
                      </th>
                    ))}
                    <th className="text-right px-4 py-3">Écart min/max</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading
                    ? Array.from({ length: 6 }).map((_, i) => (
                        <tr key={i}>
                          {Array.from({ length: activeLines.length + 2 }).map((_, j) => (
                            <td key={j} className="px-4 py-3">
                              <div className="h-4 bg-gray-100 rounded animate-pulse" />
                            </td>
                          ))}
                        </tr>
                      ))
                    : combined.slice().reverse().map((row) => {
                        const vals = activeLines.map((l) => Number(row[l.key] ?? 0)).filter((v) => v > 0);
                        const minV = vals.length ? Math.min(...vals) : null;
                        const maxV = vals.length ? Math.max(...vals) : null;
                        return (
                          <tr key={String(row.period)} className="hover:bg-gray-50/60 transition-colors">
                            <td className="px-4 py-3 font-medium text-gray-800">
                              {formatPeriod(String(row.period), granularity)}
                            </td>
                            {activeLines.map((l) => (
                              <td key={l.key} className="px-4 py-3 text-right font-semibold" style={{ color: l.color }}>
                                {row[l.key] != null ? String(row[l.key]) : "—"}
                              </td>
                            ))}
                            <td className="px-4 py-3 text-right text-xs text-gray-400">
                              {minV && maxV && minV !== maxV
                                ? <span className="font-medium text-gray-600">
                                    {minV} – {maxV}
                                    <span className="ml-1 text-[#E04E2F]">
                                      (+{Math.round(((maxV - minV) / minV) * 100)}%)
                                    </span>
                                  </span>
                                : "—"}
                            </td>
                          </tr>
                        );
                      })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Bandeau SMS/WhatsApp ── */}
      <div className="bg-gradient-to-br from-[#1A2C42] to-[#0f1e30] rounded-2xl p-6 text-white">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center shrink-0">
            <Smartphone className="w-5 h-5 text-[#F5A623]" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-bold text-white">Collecte terrain — SMS & WhatsApp</h3>
              <span className="text-[10px] font-semibold bg-[#F5A623]/20 text-[#F5A623] border border-[#F5A623]/30 px-2 py-0.5 rounded-full">
                Africa's Talking configuré
              </span>
            </div>
            <p className="text-white/60 text-sm mb-4 leading-relaxed">
              Les enquêteurs envoient leurs relevés par SMS au format <code className="bg-white/10 px-1.5 py-0.5 rounded text-[#F5A623]">SORGHO SAHEL 285</code>.
              Les données sont parsées, validées et agrégées automatiquement.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { icon: MessageSquare, title: "Webhook actif",       desc: "POST /api/prices/sms/at-callback" },
                { icon: RefreshCw,     title: "Agrégation auto",     desc: "Insertion immédiate + confirmation SMS" },
                { icon: Wifi,          title: "Monitoring admin",    desc: "/admin/prix — historique & simulateur" },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="bg-white/8 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Icon className="w-4 h-4 text-[#F5A623]" />
                    <span className="text-sm font-semibold text-white">{title}</span>
                  </div>
                  <p className="text-xs text-white/50">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
