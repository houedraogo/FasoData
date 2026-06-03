"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Download, Plus, AlertTriangle, Info, CheckCircle,
  FileText, TrendingUp, TrendingDown, X, ChevronDown,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  REGIONS, ALERTS, REPORTS, PROGRAM_KPIS,
} from "@/lib/mockData";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

// ── Sparkline mini ────────────────────────────────────────────────────────────

function Sparkline({ data, color, up }: { data: number[]; color: string; up: boolean }) {
  const pts = data.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width={88} height={36}>
      <AreaChart data={pts} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
        <defs>
          <linearGradient id={`sg-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity={0.2} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone" dataKey="v"
          stroke={color} strokeWidth={1.5}
          fill={`url(#sg-${color.replace("#", "")})`}
          dot={false} isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, unit, sub, change, sparkData, color,
}: {
  label: string;
  value: string | number;
  unit?: string;
  sub?: string;
  change: number;
  sparkData: number[];
  color: string;
}) {
  const isUp = change >= 0;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-2">
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">{label}</p>
      <div className="flex items-end justify-between gap-2">
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold text-gray-900">{typeof value === "number" ? value.toLocaleString("fr-FR") : value}</span>
            {unit && <span className="text-sm text-gray-400 font-medium">{unit}</span>}
          </div>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
          <div className={cn("flex items-center gap-1 mt-1.5 text-xs font-semibold", isUp ? "text-[#16A34A]" : "text-[#E04E2F]")}>
            {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {isUp ? "+" : ""}{change}%
          </div>
        </div>
        <Sparkline data={sparkData} color={isUp ? "#16A34A" : "#E04E2F"} up={isUp} />
      </div>
    </div>
  );
}

// ── Alert Item ────────────────────────────────────────────────────────────────

const SEVERITY_CFG = {
  critical: { icon: AlertTriangle, color: "text-[#E04E2F]",  bg: "bg-red-50",    dot: "bg-[#E04E2F]" },
  warning:  { icon: AlertTriangle, color: "text-[#D97706]",  bg: "bg-amber-50",  dot: "bg-[#D97706]" },
  info:     { icon: Info,          color: "text-[#2563EB]",  bg: "bg-blue-50",   dot: "bg-[#2563EB]" },
};

function AlertItem({ title, location, time, value, severity }: typeof ALERTS[0]) {
  const cfg = SEVERITY_CFG[severity];
  const Icon = cfg.icon;
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
      <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5", cfg.bg)}>
        <Icon className={cn("w-3.5 h-3.5", cfg.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 leading-snug">{title}</p>
        <p className="text-xs text-gray-400 mt-0.5">{location} · {time}</p>
      </div>
      <span className={cn("text-xs font-bold shrink-0 mt-0.5", cfg.color)}>{value}</span>
    </div>
  );
}

// ── Format badge ──────────────────────────────────────────────────────────────

const FORMAT_COLORS: Record<string, string> = {
  PDF:     "bg-red-50 text-red-600",
  XLSX:    "bg-green-50 text-green-700",
  CSV:     "bg-blue-50 text-blue-600",
  GeoJSON: "bg-purple-50 text-purple-600",
};

// ── Page principale ───────────────────────────────────────────────────────────

// ── Modal wrapper ─────────────────────────────────────────────────────────────

function Modal({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, fetchMe } = useAuth();
  const [showNouveauProg, setShowNouveauProg] = useState(false);

  // Formulaire nouveau programme
  const [prog, setProg] = useState({
    nom: "", type: "Sécurité alimentaire", regions: [] as string[],
    debut: "", fin: "", objectif: "",
  });

  useEffect(() => {
    fetchMe().then(() => {
      const u = useAuth.getState().user;
      if (!u) router.push("/auth/connexion");
      else if (u.role === "admin") router.push("/admin");
    });
  }, []);

  if (!user) return null;

  const firstName = (user.full_name ?? user.email).split(" ")[0] ?? "—";

  const barData = REGIONS.slice(0, 13).map((r) => ({
    name: r.name.length > 10 ? r.name.slice(0, 9) + "." : r.name,
    indicateur: r.indicateur, objectif: r.objectif,
  }));

  const handleExportRapport = () => {
    const rows = [
      ["Indicateur","Valeur","Variation"],
      ["Bénéficiaires touchés","12 487","+18%"],
      ["Écoles équipées","238 / 350","+24"],
      ["Coût par bénéficiaire","4 320 CFA","-7%"],
      ["Taux de complétion","67%","+5 pts"],
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "rapport_programmes_T1_2025.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("Rapport exporté");
  };

  const handleCreateProg = () => {
    if (!prog.nom.trim()) { toast.error("Le nom du programme est requis"); return; }
    toast.success(`Programme "${prog.nom}" créé avec succès !`);
    setShowNouveauProg(false);
    setProg({ nom: "", type: "Sécurité alimentaire", regions: [], debut: "", fin: "", objectif: "" });
  };

  const PROG_TYPES = ["Sécurité alimentaire","Santé communautaire","Éducation rurale","Eau & Assainissement","Agriculture"];
  const REGIONS_SELECT = ["Sahel","Centre","Est","Hauts-Bassins","Nord","Centre-Nord","Boucle du Mouhoun","Cascades"];

  return (
    <div className="p-6 lg:p-8 space-y-6">

      {/* En-tête */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-xs font-semibold text-white bg-[#1A2C42] px-3 py-1 rounded-full">
              3 programmes actifs
            </span>
            <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              Période : 1er trim. 2025
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mt-3">
            Bonjour {firstName}. Voici le pouls de vos programmes.
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportRapport}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors bg-white">
            <Download className="w-4 h-4" />
            Exporter rapport
          </button>
          <button
            onClick={() => setShowNouveauProg(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#1A2C42] hover:bg-[#0f1e30] text-white rounded-xl text-sm font-semibold transition-colors">
            <Plus className="w-4 h-4" />
            Nouveau programme
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Bénéficiaires touchés"
          value={PROGRAM_KPIS.beneficiaires.value}
          unit="pers."
          change={PROGRAM_KPIS.beneficiaires.change}
          sparkData={PROGRAM_KPIS.beneficiaires.spark}
          color="#16A34A"
        />
        <KpiCard
          label="Écoles équipées"
          value={PROGRAM_KPIS.ecoles.value}
          sub={`/ ${PROGRAM_KPIS.ecoles.total} prévues`}
          change={PROGRAM_KPIS.ecoles.change}
          sparkData={PROGRAM_KPIS.ecoles.spark}
          color="#16A34A"
        />
        <KpiCard
          label="Coût par bénéficiaire"
          value={PROGRAM_KPIS.cout.value.toLocaleString("fr-FR")}
          unit="CFA"
          change={PROGRAM_KPIS.cout.change}
          sparkData={PROGRAM_KPIS.cout.spark}
          color="#E04E2F"
        />
        <KpiCard
          label="Taux de complétion"
          value={`${PROGRAM_KPIS.completion.value}`}
          unit="%"
          sub={`+${PROGRAM_KPIS.completion.change} pts`}
          change={PROGRAM_KPIS.completion.change}
          sparkData={PROGRAM_KPIS.completion.spark}
          color="#16A34A"
        />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Bar chart indicateurs */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-1 h-4 bg-[#E04E2F] rounded-full block" />
                <h2 className="font-bold text-gray-900 text-sm">Indicateurs de programme · Sécurité alimentaire</h2>
              </div>
              <p className="text-xs text-gray-400 mt-0.5 ml-3">Suivi mensuel, 13 régions</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50">
                <span>= Filtrer</span>
              </button>
              <button className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50">
                ↓ PNG
              </button>
            </div>
          </div>

          {/* Légende */}
          <div className="flex items-center gap-5 mb-3 ml-1">
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-3 h-3 rounded-sm bg-[#E04E2F] block" /> Indicateur de couverture
            </span>
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-3 h-3 rounded-sm bg-[#1A2C42] block" /> Objectif Q1
            </span>
          </div>

          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E5E7EB", boxShadow: "0 1px 8px rgba(0,0,0,0.08)" }}
                formatter={(v: number, name: string) => [v, name === "indicateur" ? "Couverture" : "Objectif"]}
              />
              <Bar dataKey="indicateur" fill="#E04E2F" radius={[3, 3, 0, 0]} barSize={14} />
              <Bar dataKey="objectif"   fill="#1A2C42" radius={[3, 3, 0, 0]} barSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Alertes actives */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-1 h-4 bg-[#E04E2F] rounded-full block" />
              <h2 className="font-bold text-gray-900 text-sm">Alertes actives</h2>
            </div>
            <span className="text-xs font-semibold text-[#E04E2F] bg-red-50 px-2 py-0.5 rounded-full">
              {ALERTS.length} nouvelles
            </span>
          </div>
          <div>
            {ALERTS.map((a) => <AlertItem key={a.id} {...a} />)}
          </div>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Répartition géographique */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1 h-4 bg-[#16A34A] rounded-full block" />
            <h2 className="font-bold text-gray-900 text-sm">Répartition géographique</h2>
            <span className="text-xs text-gray-400 ml-1">Bénéficiaires par région</span>
          </div>
          <div className="space-y-2.5">
            {REGIONS.sort((a, b) => b.beneficiaires - a.beneficiaires).slice(0, 7).map((r) => {
              const max = REGIONS[0].beneficiaires;
              const pct = Math.round((r.beneficiaires / REGIONS.sort((a,b) => b.beneficiaires-a.beneficiaires)[0].beneficiaires) * 100);
              return (
                <div key={r.name} className="flex items-center gap-3">
                  <span className="text-xs text-gray-600 w-28 shrink-0 truncate">{r.name}</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#E04E2F]"
                      style={{ width: `${(r.beneficiaires / max) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-gray-700 w-12 text-right">
                    {r.beneficiaires.toLocaleString("fr-FR")}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Rapports récents */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-1 h-4 bg-[#16A34A] rounded-full block" />
              <h2 className="font-bold text-gray-900 text-sm">Rapports & livrables récents</h2>
            </div>
            <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">Générés automatiquement</span>
          </div>
          <div className="space-y-1">
            {REPORTS.map((r) => (
              <div key={r.id} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0 group hover:bg-gray-50/50 -mx-2 px-2 rounded-xl transition-colors">
                <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center shrink-0">
                  <FileText className="w-3.5 h-3.5 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate">{r.title}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{r.desc} · {r.date} · {r.size}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", FORMAT_COLORS[r.format] ?? "bg-gray-100 text-gray-500")}>
                    {r.format}
                  </span>
                  <button className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-[#1A2C42] transition-all">
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Modal : Nouveau programme ──────────────────────────────────────── */}
      <div style={{ display: showNouveauProg ? "flex" : "none" }} className="fixed inset-0 z-[9999] items-center justify-center"><div className="absolute inset-0 bg-black/50" onClick={() => setShowNouveauProg(false)} /><div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-y-auto max-h-[90vh]"><div className="flex items-center justify-between px-6 py-4 border-b border-gray-100"><h2 className="font-bold text-gray-900">Créer un nouveau programme</h2><button onClick={() => setShowNouveauProg(false)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button></div><div className="px-6 py-5">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Nom du programme <span className="text-[#E04E2F]">*</span>
            </label>
            <input type="text" value={prog.nom}
              onChange={(e) => setProg((p) => ({ ...p, nom: e.target.value }))}
              placeholder="ex: Nutrition Sahel 2025"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A2C42]/20" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Type</label>
            <div className="relative">
              <select value={prog.type} onChange={(e) => setProg((p) => ({ ...p, type: e.target.value }))}
                className="w-full appearance-none px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A2C42]/20">
                {PROG_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Régions ciblées</label>
            <div className="flex flex-wrap gap-2">
              {REGIONS_SELECT.map((r) => (
                <button key={r} type="button"
                  onClick={() => setProg((p) => ({
                    ...p,
                    regions: p.regions.includes(r) ? p.regions.filter((x) => x !== r) : [...p.regions, r],
                  }))}
                  className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                    prog.regions.includes(r)
                      ? "bg-[#1A2C42] text-white border-[#1A2C42]"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300")}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Début</label>
              <input type="date" value={prog.debut}
                onChange={(e) => setProg((p) => ({ ...p, debut: e.target.value }))}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A2C42]/20" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Fin</label>
              <input type="date" value={prog.fin}
                onChange={(e) => setProg((p) => ({ ...p, fin: e.target.value }))}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A2C42]/20" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Objectif chiffré</label>
            <input type="text" value={prog.objectif}
              onChange={(e) => setProg((p) => ({ ...p, objectif: e.target.value }))}
              placeholder="ex: 15 000 bénéficiaires"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A2C42]/20" />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button onClick={() => setShowNouveauProg(false)}
              className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
              Annuler
            </button>
            <button onClick={handleCreateProg}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#1A2C42] hover:bg-[#0f1e30] text-white rounded-xl text-sm font-semibold">
              <Plus className="w-4 h-4" /> Créer le programme
            </button>
          </div>
        </div>
      </div></div></div>
    </div>
  );
}
