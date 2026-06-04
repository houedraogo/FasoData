"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";
import {
  Download, Settings, GitCompare, Plus, X, Filter,
  Image as ImageIcon, Bell, AlertTriangle, CheckCircle,
  ChevronDown,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

// ── Types données prix ────────────────────────────────────────────────────────

interface Commodity { name: string; price: number; change: number; color: string; data: number[]; }
interface PriceEvolutionRow { month: string; sahel: number; centre: number; hauts: number; cascades: number; }
interface RegionData { name: string; prix_mais: number; indicateur?: number; objectif?: number; }
interface FoodPricesData {
  commodities: Commodity[];
  price_evolution: PriceEvolutionRow[];
  regions: RegionData[];
  volatility: { name: string; sigma: number }[];
}

// Données statiques (heatmap saisonnière — calculées à partir des historiques)
const MONTHS_SHORT = ["J","F","M","A","M","J","J","A","S","O","N","D"];
const HEATMAP = [
  { year: 2022, values: [280,275,270,265,272,290,310,325,315,295,285,278] },
  { year: 2023, values: [285,280,275,270,278,298,318,332,320,300,290,282] },
  { year: 2024, values: [292,288,283,278,285,305,325,342,330,308,296,290] },
  { year: 2025, values: [298,295,290,285,292,312,332,null,null,null,null,null] },
];

function heatColor(val: number | null): string {
  if (val === null) return "#F3F4F6";
  if (val < 280) return "#D1FAE5";
  if (val < 300) return "#86EFAC";
  if (val < 320) return "#FDE68A";
  if (val < 335) return "#FDBA74";
  return "#FCA5A5";
}

// ── Modal wrapper ─────────────────────────────────────────────────────────────

function Modal({
  open, onClose, title, children,
}: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ── Types alertes ─────────────────────────────────────────────────────────────

interface Program {
  id: string;
  name: string;
  sector: string;
  period: string;
}

interface ProgramPriceAlert {
  id: string;
  commodity: string;
  region: string;
  threshold_price: number;
  current_price: number | null;
  is_triggered: boolean;
}

interface ProgramDetail extends Program {
  alerts: ProgramPriceAlert[];
}

interface Alerte {
  id: string | number; label: string; seuil: string; value: number; alert: boolean;
}

const PRODUCT_TO_KEY: Record<string, string> = {
  "Maïs": "maize",
  "MaÃ¯s": "maize",
  "Mil": "millet",
  "Sorgho": "sorghum",
  "Riz local": "rice_local",
  "Haricot": "cowpea",
  "Niébé": "cowpea",
  "NiÃ©bÃ©": "cowpea",
};

const KEY_TO_LABEL: Record<string, string> = {
  maize: "Maïs",
  millet: "Mil",
  sorghum: "Sorgho",
  rice_local: "Riz local",
  cowpea: "Niébé",
  groundnut: "Arachide",
};

// ── Page principale ───────────────────────────────────────────────────────────

export default function ProgrammesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Modals
  const [showCompare,   setShowCompare]   = useState(false);
  const [showAddAlerte, setShowAddAlerte] = useState(false);
  const [showFilter,    setShowFilter]    = useState(false);

  // Alertes dynamiques
  const [alertes, setAlertes] = useState<Alerte[]>([
    { id: 1, label: "Maïs · Sahel",        seuil: "> 320 CFA/kg", value: 342, alert: true },
    { id: 2, label: "Riz local · National", seuil: "> 500 CFA/kg", value: 520, alert: true },
    { id: 3, label: "Mil · Nord",           seuil: "> 380 CFA/kg", value: 375, alert: false },
    { id: 4, label: "Sorgho · Centre",      seuil: "> 320 CFA/kg", value: 305, alert: false },
  ]);

  // ── Données prix depuis l'API ─────────────────────────────────────────────
  const { data: foodPrices, isLoading: pricesLoading } = useQuery<FoodPricesData>({
    queryKey: ["dashboard-food-prices"],
    queryFn: async () => {
      const { data } = await api.get("/dashboard/food-prices");
      return data;
    },
    staleTime: 5 * 60_000,
  });

  const COMMODITIES    = foodPrices?.commodities    ?? [];
  const PRICE_EVOLUTION = foodPrices?.price_evolution ?? [];
  const VOLATILITY     = (foodPrices?.volatility ?? []).map((v, i) => ({
    ...v, color: i < 2 ? "#E04E2F" : i < 4 ? "#D97706" : "#16A34A",
  }));
  const REGIONAL = (foodPrices?.regions ?? [])
    .slice().sort((a, b) => b.prix_mais - a.prix_mais)
    .map((r) => ({ name: r.name.replace("Boucle du Mouhoun", "Boucle"), value: r.prix_mais }));

  const { data: programs } = useQuery<Program[]>({
    queryKey: ["programs", "food_prices"],
    queryFn: async () => {
      const { data } = await api.get("/dashboard/programs?sector=food_prices");
      return data;
    },
  });

  const activeProgram = programs?.[0];

  const { data: programDetail, isLoading: alertsLoading } = useQuery<ProgramDetail>({
    queryKey: ["program", activeProgram?.id],
    queryFn: async () => {
      const { data } = await api.get(`/dashboard/programs/${activeProgram!.id}`);
      return data;
    },
    enabled: Boolean(activeProgram?.id),
  });

  const apiAlertes = useMemo<Alerte[]>(
    () => (programDetail?.alerts ?? []).map((item) => ({
      id: item.id,
      label: `${KEY_TO_LABEL[item.commodity] ?? item.commodity} · ${item.region}`,
      seuil: `> ${Math.round(item.threshold_price)} CFA/kg`,
      value: Math.round(item.current_price ?? 0),
      alert: item.is_triggered,
    })),
    [programDetail?.alerts]
  );

  const displayedAlertes = programDetail ? apiAlertes : alertes;
  const criticalAlertCount = displayedAlertes.filter((item) => item.alert).length;

  // Formulaire nouvelle alerte
  const [newAlerte, setNewAlerte] = useState({ produit: "Maïs", region: "Sahel", seuil: "320" });

  const createAlert = useMutation({
    mutationFn: async () => {
      if (!activeProgram?.id) throw new Error("Programme introuvable");
      const commodity = PRODUCT_TO_KEY[newAlerte.produit] ?? newAlerte.produit;
      const { data } = await api.post(`/dashboard/programs/${activeProgram.id}/alerts`, {
        commodity,
        region: newAlerte.region,
        threshold_price: Number(newAlerte.seuil),
        channels: ["dashboard", "email", "whatsapp"],
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["program", activeProgram?.id] });
      setShowAddAlerte(false);
      setNewAlerte({ produit: "Maïs", region: "Sahel", seuil: "320" });
      toast.success("Alerte enregistree en base !");
    },
    onError: () => toast.error("Impossible d'enregistrer l'alerte"),
  });

  // Filtre période
  const [activePeriod, setActivePeriod] = useState("12m");

  // Comparaison scénarios
  const [region1, setRegion1] = useState("sahel");
  const [region2, setRegion2] = useState("centre");

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleExportCSV = () => {
    const header = "Semaine,Sahel,Centre,Hauts-Bassins,Cascades\n";
    const rows = PRICE_EVOLUTION
      .map((r) => `${r.month},${r.sahel},${r.centre},${r.hauts},${r.cascades}`)
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "prix_alimentaires_fasodata.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("Export CSV téléchargé");
  };

  const handleAddAlerte = () => {
    if (!newAlerte.seuil || isNaN(Number(newAlerte.seuil))) {
      toast.error("Seuil invalide"); return;
    }
    createAlert.mutate();
  };

  const handlePNG = () => {
    toast("📷 Export PNG — fonctionnalité disponible en version Pro", { icon: "ℹ️" });
  };

  const compareData = PRICE_EVOLUTION.map((row) => ({
    month: row.month,
    [region1]: row[region1 as keyof typeof row] as number,
    [region2]: row[region2 as keyof typeof row] as number,
  }));

  const REGION_OPTIONS = [
    { key: "sahel",   label: "Sahel" },
    { key: "centre",  label: "Centre" },
    { key: "hauts",   label: "Hauts-Bassins" },
    { key: "cascades",label: "Cascades" },
  ];

  const PRODUITS = ["Maïs","Mil","Sorgho","Riz local","Haricot","Niébé"];
  const REGIONS_NAMES = (foodPrices?.regions ?? []).map((r) => r.name);

  return (
    <div className="p-6 lg:p-8 space-y-6">

      {/* En-tête */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {["13 régions", "Maïs, mil, sorgho, riz, haricot", "Période : 12 derniers mois"].map((chip) => (
              <span key={chip} className="text-xs font-medium bg-[#1A2C42] text-white px-3 py-1.5 rounded-full">{chip}</span>
            ))}
            <span className="text-xs font-semibold text-[#E04E2F] bg-red-50 border border-red-100 px-3 py-1.5 rounded-full">
              {criticalAlertCount} alertes critiques
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Suivi des prix alimentaires</h1>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => router.push("/dashboard/alertes")}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium bg-white hover:bg-gray-50 transition-colors"
          >
            <Settings className="w-4 h-4" /> Configurer alertes
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium bg-white hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button
            onClick={() => setShowCompare(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#E04E2F] hover:bg-[#c73e22] text-white rounded-xl text-sm font-semibold transition-colors"
          >
            <GitCompare className="w-4 h-4" /> Comparer scénarios
          </button>
        </div>
      </div>

      {/* KPI céréales */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {pricesLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 animate-pulse">
                <div className="h-4 bg-gray-100 rounded w-16 mb-3" />
                <div className="h-8 bg-gray-100 rounded w-20 mb-1" />
                <div className="h-3 bg-gray-100 rounded w-12" />
              </div>
            ))
          : COMMODITIES.map((c) => (
            <div key={c.name} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-700">{c.name}</p>
                <span className={cn("w-2 h-2 rounded-full", c.change > 0 ? "bg-[#E04E2F]" : "bg-[#16A34A]")} />
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {c.price} <span className="text-xs font-normal text-gray-400">CFA/kg</span>
              </p>
              <p className={cn("text-xs font-semibold mt-1", c.change > 0 ? "text-[#E04E2F]" : "text-[#16A34A]")}>
                {c.change > 0 ? "↑" : "↓"} {Math.abs(c.change)}%
              </p>
            </div>
          ))
        }
      </div>

      {/* Évolution + Comparaison régionale */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Évolution prix maïs */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="w-1 h-4 bg-[#E04E2F] rounded-full" />
              <h2 className="font-bold text-gray-900 text-sm">Évolution des prix · maïs blanc · CFA/kg</h2>
            </div>
            <div className="flex items-center gap-2">
              {/* Filtre période */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
                {["7j","30j","3m","12m","3a"].map((p) => (
                  <button
                    key={p}
                    onClick={() => setActivePeriod(p)}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                      activePeriod === p ? "bg-[#1A2C42] text-white" : "text-gray-500 hover:text-gray-700"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowFilter(!showFilter)}
                className={cn("flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs transition-colors",
                  showFilter ? "border-[#E04E2F] text-[#E04E2F] bg-red-50" : "border-gray-200 text-gray-600 hover:bg-gray-50")}
              >
                <Filter className="w-3.5 h-3.5" /> Filtrer
              </button>
              <button
                onClick={handlePNG}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50"
              >
                <ImageIcon className="w-3.5 h-3.5" /> PNG
              </button>
            </div>
          </div>

          {/* Panel filtre */}
          {showFilter && (
            <div className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-200">
              <p className="text-xs font-semibold text-gray-600 mb-3">Filtrer les régions affichées</p>
              <div className="flex flex-wrap gap-2">
                {["Sahel","Centre","Hauts-Bassins","Cascades"].map((r) => (
                  <button key={r}
                    className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:border-[#E04E2F] hover:text-[#E04E2F] transition-colors">
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-gray-400 mb-4 ml-3">Comparaison 4 régions + seuil d'alerte</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={PRICE_EVOLUTION} margin={{ top: 4, right: 12, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} domain={[220, 360]} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E5E7EB" }} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              <ReferenceLine y={320} stroke="#E04E2F" strokeDasharray="4 4"
                label={{ value: "Seuil critique 320", fontSize: 10, fill: "#E04E2F" }} />
              <Line type="monotone" dataKey="sahel"    name="Sahel"         stroke="#E04E2F" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="centre"   name="Centre"        stroke="#1A2C42" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="hauts"    name="Hauts-Bassins" stroke="#16A34A" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="cascades" name="Cascades"      stroke="#F59E0B" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Comparaison régionale */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1 h-4 bg-[#E04E2F] rounded-full" />
            <h2 className="font-bold text-gray-900 text-sm">Comparaison régionale</h2>
            <span className="text-xs text-gray-400 ml-1">Maïs · W42</span>
          </div>
          <div className="space-y-2">
            {REGIONAL.map((r) => (
              <div key={r.name} className="flex items-center gap-2">
                <span className="text-xs text-gray-600 w-24 shrink-0 truncate">{r.name}</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{
                    width: `${(r.value / 360) * 100}%`,
                    background: r.value >= 320 ? "#E04E2F" : r.value >= 300 ? "#D97706" : "#16A34A",
                  }} />
                </div>
                <span className="text-xs font-bold text-gray-700 w-8 text-right">{r.value}</span>
              </div>
            ))}
            <p className="text-[10px] text-[#E04E2F] text-right mt-1">| Seuil critique 320</p>
          </div>
        </div>
      </div>

      {/* Volatilité + Heatmap + Alertes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Volatilité */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1 h-4 bg-[#E04E2F] rounded-full" />
            <h2 className="font-bold text-gray-900 text-sm">Volatilité par produit</h2>
            <span className="text-xs text-gray-400">Écart-type 12 mois</span>
          </div>
          <div className="space-y-3">
            {VOLATILITY.map((v) => (
              <div key={v.name} className="flex items-center gap-3">
                <span className="text-xs text-gray-600 w-20 shrink-0">{v.name}</span>
                <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${(v.sigma / 40) * 100}%`, background: v.color }} />
                </div>
                <span className="text-xs font-bold text-gray-700 w-10 text-right">σ {v.sigma}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Heatmap saisonnière */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1 h-4 bg-[#E04E2F] rounded-full" />
            <h2 className="font-bold text-gray-900 text-sm">Heatmap saisonnière</h2>
            <span className="text-xs text-gray-400">Maïs · prix moyens</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex gap-1 mb-1">
              <div className="w-8" />
              {MONTHS_SHORT.map((m) => (
                <div key={m} className="flex-1 text-center text-[9px] text-gray-400 font-medium">{m}</div>
              ))}
            </div>
            {HEATMAP.map((row) => (
              <div key={row.year} className="flex items-center gap-1">
                <span className="text-[10px] text-gray-400 w-8 shrink-0">{row.year}</span>
                {row.values.map((val, j) => (
                  <div key={j} className="flex-1 h-5 rounded-sm" style={{ background: heatColor(val) }}
                    title={val ? `${val} CFA/kg` : "—"} />
                ))}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-3 text-[9px] text-gray-400">
            <span>Bas</span>
            <div className="flex gap-0.5">
              {["#D1FAE5","#86EFAC","#FDE68A","#FDBA74","#FCA5A5"].map((c) => (
                <div key={c} className="w-5 h-2.5 rounded-sm" style={{ background: c }} />
              ))}
            </div>
            <span>Élevé</span>
          </div>
          <p className="text-[10px] text-gray-500 mt-2">
            Pic en <span className="font-semibold text-[#D97706]">juillet-août</span> (soudure)
          </p>
        </div>

        {/* Alertes & seuils — interactif */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1 h-4 bg-[#E04E2F] rounded-full" />
            <h2 className="font-bold text-gray-900 text-sm">Alertes & seuils</h2>
            <span className="text-xs text-gray-400">Configurables par produit</span>
          </div>
          <div className="space-y-3">
            {(alertsLoading ? alertes : displayedAlertes).map((item) => (
              <div key={item.id}
                className="flex items-center justify-between gap-3 py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2">
                  <span className={cn("w-2 h-2 rounded-full shrink-0",
                    item.alert ? "bg-[#E04E2F]" : "bg-[#16A34A]")} />
                  <div>
                    <p className="text-xs font-medium text-gray-800">{item.label}</p>
                    <p className="text-[10px] text-gray-400">Seuil {item.seuil}</p>
                  </div>
                </div>
                <span className={cn("text-sm font-bold", item.alert ? "text-[#E04E2F]" : "text-[#16A34A]")}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
          <button
            onClick={() => setShowAddAlerte(true)}
            className="w-full mt-3 py-2 border-2 border-dashed border-gray-200 rounded-xl text-xs font-medium text-gray-400 hover:border-[#E04E2F]/40 hover:text-[#E04E2F] hover:bg-red-50/20 transition-colors flex items-center justify-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Ajouter une alerte
          </button>
        </div>
      </div>

      {/* ── Modal : Comparer scénarios ──────────────────────────────────────── */}
      {showCompare && <div className="fixed inset-0 z-[9999] flex items-center justify-center"><div className="absolute inset-0 bg-black/50" onClick={() => setShowCompare(false)} /><div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-y-auto max-h-[90vh]"><div className="flex items-center justify-between px-6 py-4 border-b border-gray-100"><h2 className="font-bold text-gray-900">Comparer deux régions</h2><button onClick={() => setShowCompare(false)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button></div><div className="px-6 py-5">
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Région 1", value: region1, set: setRegion1, color: "#E04E2F" },
              { label: "Région 2", value: region2, set: setRegion2, color: "#1A2C42" },
            ].map(({ label, value, set, color }) => (
              <div key={label}>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  {label}
                </label>
                <div className="relative">
                  <select
                    value={value}
                    onChange={(e) => set(e.target.value)}
                    className="w-full appearance-none px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E04E2F]/20"
                  >
                    {REGION_OPTIONS.map((r) => (
                      <option key={r.key} value={r.key}>{r.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                <div className="mt-1 h-1 rounded-full" style={{ background: color }} />
              </div>
            ))}
          </div>

          {/* Graphique de comparaison */}
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs font-semibold text-gray-500 mb-3">
              Prix du maïs — {REGION_OPTIONS.find((r) => r.key === region1)?.label} vs {REGION_OPTIONS.find((r) => r.key === region2)?.label}
            </p>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={compareData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <ReferenceLine y={320} stroke="#E04E2F" strokeDasharray="3 3" />
                <Line type="monotone" dataKey={region1}
                  name={REGION_OPTIONS.find((r) => r.key === region1)?.label}
                  stroke="#E04E2F" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey={region2}
                  name={REGION_OPTIONS.find((r) => r.key === region2)?.label}
                  stroke="#1A2C42" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="flex gap-3 justify-end">
            <button onClick={() => setShowCompare(false)}
              className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
              Fermer
            </button>
            <button onClick={() => { handleExportCSV(); setShowCompare(false); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#1A2C42] text-white rounded-xl text-sm font-semibold">
              <Download className="w-4 h-4" /> Exporter la comparaison
            </button>
          </div>
        </div></div></div></div>}

      {/* ── Modal : Ajouter une alerte ──────────────────────────────────────── */}
      {showAddAlerte && <div className="fixed inset-0 z-[9999] flex items-center justify-center"><div className="absolute inset-0 bg-black/50" onClick={() => setShowAddAlerte(false)} /><div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-y-auto max-h-[90vh]"><div className="flex items-center justify-between px-6 py-4 border-b border-gray-100"><h2 className="font-bold text-gray-900">Configurer une alerte de prix</h2><button onClick={() => setShowAddAlerte(false)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button></div><div className="px-6 py-5">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Recevez une notification lorsque le prix d'une céréale dépasse un seuil dans une région donnée.
          </p>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Produit</label>
            <div className="relative">
              <select
                value={newAlerte.produit}
                onChange={(e) => setNewAlerte((p) => ({ ...p, produit: e.target.value }))}
                className="w-full appearance-none px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E04E2F]/20"
              >
                {PRODUITS.map((p) => <option key={p}>{p}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Région</label>
            <div className="relative">
              <select
                value={newAlerte.region}
                onChange={(e) => setNewAlerte((p) => ({ ...p, region: e.target.value }))}
                className="w-full appearance-none px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E04E2F]/20"
              >
                {REGIONS_NAMES.map((r) => <option key={r}>{r}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Seuil d'alerte (CFA/kg)
            </label>
            <div className="relative">
              <Bell className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="number"
                value={newAlerte.seuil}
                onChange={(e) => setNewAlerte((p) => ({ ...p, seuil: e.target.value }))}
                placeholder="ex: 350"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E04E2F]/20"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Une alerte sera déclenchée si le prix dépasse ce seuil.
            </p>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button onClick={() => setShowAddAlerte(false)}
              className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
              Annuler
            </button>
            <button
              onClick={handleAddAlerte}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#E04E2F] hover:bg-[#c73e22] text-white rounded-xl text-sm font-semibold transition-colors"
            >
              <CheckCircle className="w-4 h-4" /> Créer l'alerte
            </button>
          </div>
        </div>
      </div></div></div>}
    </div>
  );
}
