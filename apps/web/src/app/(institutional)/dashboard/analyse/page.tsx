"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts";
import {
  BarChart3, Eye, Download, Database, TrendingUp,
  ChevronDown, Layers, FileText, Info, AlertTriangle, RefreshCw,
} from "lucide-react";
import { api } from "@/lib/api";
import { formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";

// ── Palette de couleurs ───────────────────────────────────────────────────────

const NAVY   = "#1A2C42";
const RED    = "#E04E2F";
const GOLD   = "#F5A623";
const GREEN  = "#2E7D52";
const TEAL   = "#0891B2";
const INDIGO = "#4F46E5";
const ROSE   = "#E11D48";

const CATEGORY_COLORS: Record<string, string> = {
  "Agriculture":    GREEN,
  "Sante":          RED,
  "Education":      INDIGO,
  "Economie":       GOLD,
  "Environnement":  TEAL,
  "Geographie":     NAVY,
  default:       "#94A3B8",
};

const PIE_COLORS = [NAVY, RED, GOLD, GREEN, TEAL, INDIGO, ROSE, "#F59E0B"];

const TYPE_COLORS: Record<string, string> = {
  "Entier": NAVY, "Decimal": TEAL, "Texte": GREEN,
  "Date": GOLD, "Horodatage": INDIGO, "Booleen": RED,
};

// Tooltip custom
const CustomTooltip = ({
  active, payload, label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-700 mb-1.5">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-500">{p.name} :</span>
          <span className="font-medium text-gray-800">{formatNumber(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

// ── Carte KPI ────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, icon: Icon, color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", color)}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-2xl font-bold text-faso-navy">
        {typeof value === "number" ? formatNumber(value) : value}
      </div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-green-600 mt-1.5 font-medium">{sub}</div>}
    </div>
  );
}

// ── Titre de section ──────────────────────────────────────────────────────────

function SectionTitle({ icon: Icon, title, sub }: { icon: React.ElementType; title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div className="w-8 h-8 bg-faso-navy/10 rounded-lg flex items-center justify-center">
        <Icon className="w-4 h-4 text-faso-navy" />
      </div>
      <div>
        <h2 className="font-bold text-gray-900 text-sm">{title}</h2>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}

// ── Squelette chargement ──────────────────────────────────────────────────────

function ChartSkeleton({ height = 220 }: { height?: number }) {
  return (
    <div className="animate-pulse flex flex-col gap-3">
      <div className="h-4 bg-gray-100 rounded w-1/3" />
      <div className="bg-gray-50 rounded-xl" style={{ height }} />
    </div>
  );
}

// ── Helper type colonne → label court ────────────────────────────────────────

function typeLabel(type?: string) {
  if (!type) return "—";
  if (type.includes("int"))       return "Entier";
  if (type.includes("float"))     return "Décimal";
  if (type.includes("datetime"))  return "Horodatage";
  if (type.includes("date"))      return "Date";
  if (type.includes("bool"))      return "Booléen";
  return "Texte";
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function AnalysePage() {
  const [selectedSlug, setSelectedSlug] = useState<string>("");

  // ── 1. Tous les datasets (publics) ────────────────────────────────────────
  const { data: allData, isLoading: allLoading, isError: allError, isFetching: allFetching, refetch: refetchAll } = useQuery({
    queryKey: ["analyse-datasets"],
    queryFn: async () => {
      const { data } = await api.get("/datasets?page_size=50&status=published");
      return data;
    },
  });

  // ── 2. Stats du dataset sélectionné ───────────────────────────────────────
  const { data: selectedStats, isLoading: statsLoading, isError: statsError, isFetching: statsFetching, refetch: refetchStats } = useQuery({
    queryKey: ["analyse-stats", selectedSlug],
    queryFn: async () => {
      const { data } = await api.get(`/datasets/${selectedSlug}/stats`);
      return data;
    },
    enabled: !!selectedSlug,
  });

  // ── Données calculées ─────────────────────────────────────────────────────
  const datasets: {
    id: string; slug: string; name: string; category: string | null;
    view_count: number; download_count: number; row_count: number | null;
    file_format: string | null;
  }[] = allData?.items ?? [];

  // KPIs globaux
  const totalViews     = useMemo(() => datasets.reduce((s, d) => s + d.view_count, 0), [datasets]);
  const totalDownloads = useMemo(() => datasets.reduce((s, d) => s + d.download_count, 0), [datasets]);
  const totalRows      = useMemo(() => datasets.reduce((s, d) => s + (d.row_count ?? 0), 0), [datasets]);
  const dlRate         = totalViews ? Math.round((totalDownloads / totalViews) * 100) : 0;

  // Top 8 datasets par vues (BarChart)
  const topDatasets = useMemo(
    () =>
      [...datasets]
        .sort((a, b) => b.view_count - a.view_count)
        .slice(0, 8)
        .map((d) => ({
          name: d.name.length > 24 ? d.name.slice(0, 22) + "…" : d.name,
          fullName: d.name,
          slug: d.slug,
          vues: d.view_count,
          telechargements: d.download_count,
        })),
    [datasets]
  );

  // Répartition par catégorie (PieChart)
  const byCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const d of datasets) {
      const cat = d.category || "Autre";
      counts[cat] = (counts[cat] ?? 0) + 1;
    }
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [datasets]);

  // Répartition par format (BarChart)
  const byFormat = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const d of datasets) {
      const fmt = d.file_format?.toUpperCase() || "N/A";
      counts[fmt] = (counts[fmt] ?? 0) + 1;
    }
    return Object.entries(counts).map(([format, count]) => ({ format, count }));
  }, [datasets]);

  // Historique mensuel: volontairement vide tant que l'API ne fournit pas
  // de series mensuelles reelles.
  const trendData: { month: string; vues: number; telechargements: number }[] = [];

  // Dataset sélectionné (objet complet)
  const selectedDataset = datasets.find((d) => d.slug === selectedSlug);

  // Tendance mensuelle du dataset sélectionné
  const selectedTrend: { month: string; vues: number; telechargements: number }[] = [];

  // Complétude des colonnes
  const columnCompleteness = useMemo(() => {
    if (!selectedStats?.columns || !selectedStats.row_count) return [];
    return selectedStats.columns.map((col: { name: string; type?: string; null_count?: number }) => ({
      name: col.name.length > 16 ? col.name.slice(0, 14) + "…" : col.name,
      fullName: col.name,
      type: typeLabel(col.type),
      completude: selectedStats.row_count && col.null_count != null
        ? Math.round(((selectedStats.row_count - col.null_count) / selectedStats.row_count) * 100)
        : 100,
    }));
  }, [selectedStats]);

  // Répartition des types de colonnes
  const typeDist = useMemo(() => {
    if (!selectedStats?.columns) return [];
    const counts: Record<string, number> = {};
    for (const col of selectedStats.columns) {
      const t = typeLabel(col.type);
      counts[t] = (counts[t] ?? 0) + 1;
    }
    return Object.entries(counts).map(([type, value]) => ({ type, value }));
  }, [selectedStats]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 lg:p-8 space-y-8">

      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-faso-navy">Analyse des données</h1>
          <p className="text-gray-500 text-sm mt-1">
            {allError ? "Données analytiques indisponibles" : `Vue d'ensemble des ${datasets.length} dataset(s) publiés`}
          </p>
        </div>
      </div>

      {allError && (
        <div className="rounded-2xl border border-amber-100 bg-amber-50 px-5 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
            <div>
              <p className="text-sm font-semibold text-amber-900">Impossible de charger les données d'analyse</p>
              <p className="mt-0.5 text-xs text-amber-700">Les graphiques seront disponibles dès que l'API datasets répondra.</p>
            </div>
          </div>
          <button
            onClick={() => refetchAll()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-semibold text-amber-700 shadow-sm ring-1 ring-amber-100 hover:bg-amber-50"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", allFetching && "animate-spin")} />
            Réessayer
          </button>
        </div>
      )}

      {/* ── Section 1 : KPIs globaux ────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {allLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-pulse">
              <div className="w-10 h-10 bg-gray-100 rounded-xl mb-3" />
              <div className="h-6 bg-gray-100 rounded w-2/3 mb-1" />
              <div className="h-3 bg-gray-50 rounded w-1/2" />
            </div>
          ))
        ) : (
          <>
            <KpiCard label="Datasets publiés"    value={datasets.length}   icon={Database}   color="bg-blue-50 text-blue-600"   sub={`${allData?.total || 0} au total`} />
            <KpiCard label="Vues totales"         value={totalViews}        icon={Eye}         color="bg-purple-50 text-purple-600" />
            <KpiCard label="Téléchargements"      value={totalDownloads}    icon={Download}    color="bg-green-50 text-green-600" />
            <KpiCard label="Taux de téléchargement" value={`${dlRate}%`}   icon={TrendingUp}  color="bg-orange-50 text-orange-600" sub="Téléch. / vues" />
          </>
        )}
      </div>

      {/* ── Section 2 : Tendance + Catégories ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Tendance mensuelle */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <SectionTitle icon={TrendingUp} title="Tendance mensuelle" sub="En attente de l'historique mensuel fourni par l'API" />
          {allLoading ? (
            <ChartSkeleton height={200} />
          ) : trendData.length ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={trendData} margin={{ top: 4, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gVues" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={NAVY} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={NAVY} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gDl" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={RED} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={RED} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                <Area type="monotone" dataKey="vues"            stroke={NAVY} strokeWidth={2} fill="url(#gVues)" dot={false} activeDot={{ r: 4 }} />
                <Area type="monotone" dataKey="telechargements" stroke={RED}  strokeWidth={2} fill="url(#gDl)"   dot={false} activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[200px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 text-center">
              <TrendingUp className="mb-2 h-8 w-8 text-gray-300" />
              <p className="text-sm font-semibold text-gray-600">Historique mensuel non disponible</p>
              <p className="mt-1 max-w-sm text-xs text-gray-400">
                Cette courbe restera vide tant que l'API ne fournit pas les vues et telechargements par mois.
              </p>
            </div>
          )}
        </div>

        {/* Répartition par catégorie */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <SectionTitle icon={Layers} title="Par catégorie" sub={`${byCategory.length} catégorie(s)`} />
          {allLoading ? (
            <ChartSkeleton height={200} />
          ) : byCategory.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-300">
              <Database className="w-8 h-8 mb-2" />
              <p className="text-xs">Aucune donnée</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={byCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={72}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {byCategory.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [`${v} dataset(s)`, ""]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {byCategory.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-gray-600 flex-1 truncate">{item.name}</span>
                    <span className="font-semibold text-gray-800">{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Section 3 : Top datasets + Formats ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Top 8 datasets par vues */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <SectionTitle icon={Eye} title="Top datasets par vues" sub="Vues et téléchargements des 8 datasets les plus consultés" />
          {allLoading ? (
            <ChartSkeleton height={260} />
          ) : topDatasets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-300">
              <BarChart3 className="w-8 h-8 mb-2" />
              <p className="text-xs">Aucun dataset disponible</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topDatasets} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Bar dataKey="vues"            fill={NAVY} radius={[0, 4, 4, 0]} barSize={10} />
                <Bar dataKey="telechargements" fill={RED}  radius={[0, 4, 4, 0]} barSize={10} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Formats de fichier */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <SectionTitle icon={FileText} title="Formats de fichier" />
          {allLoading ? (
            <ChartSkeleton height={160} />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={byFormat} margin={{ top: 4, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="format" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: number) => [`${v} dataset(s)`, "Nombre"]} />
                  <Bar dataKey="count" fill={TEAL} radius={[4, 4, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-2">
                {byFormat.map((item) => (
                  <div key={item.format} className="flex items-center justify-between text-xs">
                    <span className="font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{item.format}</span>
                    <div className="flex-1 mx-3">
                      <div className="h-1.5 bg-gray-100 rounded-full">
                        <div
                          className="h-full bg-teal-500 rounded-full"
                          style={{ width: `${(item.count / Math.max(...byFormat.map((x) => x.count))) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="font-semibold text-gray-700">{item.count}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Section 4 : Analyse par dataset ────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <SectionTitle icon={BarChart3} title="Analyse détaillée d'un dataset" sub="Sélectionnez un dataset pour voir ses statistiques de colonnes" />
          {/* Sélecteur */}
          <div className="relative w-full sm:w-auto sm:min-w-[260px]">
            <select
              value={selectedSlug}
              onChange={(e) => setSelectedSlug(e.target.value)}
              className="w-full appearance-none pl-4 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-faso-navy/20 focus:border-faso-navy/30 bg-white text-gray-700"
            >
              <option value="">— Choisir un dataset —</option>
              {datasets.map((d) => (
                <option key={d.slug} value={d.slug}>
                  {d.name.length > 40 ? d.name.slice(0, 38) + "…" : d.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {!selectedSlug ? (
          /* État vide */
          <div className="flex flex-col items-center justify-center py-16 text-gray-300 border-2 border-dashed border-gray-100 rounded-2xl">
            <BarChart3 className="w-10 h-10 mb-3" />
            <p className="text-sm text-gray-400 font-medium">Sélectionnez un dataset ci-dessus</p>
            <p className="text-xs text-gray-300 mt-1">Les statistiques de colonnes s'afficheront ici</p>
          </div>
        ) : statsLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartSkeleton height={220} />
            <ChartSkeleton height={220} />
          </div>
        ) : statsError ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-12 text-center text-gray-400">
            <AlertTriangle className="w-8 h-8 mb-2 text-amber-300" />
            <p className="text-sm font-semibold text-gray-600">Statistiques indisponibles</p>
            <p className="text-xs text-gray-400 mt-1">Impossible de charger les statistiques de ce dataset.</p>
            <button
              onClick={() => refetchStats()}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#1A2C42] px-4 py-2 text-xs font-semibold text-white hover:bg-[#223a57]"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", statsFetching && "animate-spin")} />
              Réessayer
            </button>
          </div>
        ) : !selectedStats ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-300">
            <Info className="w-8 h-8 mb-2" />
            <p className="text-sm text-gray-400">Aucune statistique disponible pour ce dataset.</p>
            <p className="text-xs text-gray-300 mt-1">Importez un fichier pour générer les statistiques.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* KPIs dataset */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-faso-navy">{formatNumber(selectedStats.row_count || 0)}</div>
                <div className="text-xs text-gray-500 mt-0.5">Lignes</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-faso-navy">{selectedStats.column_count || 0}</div>
                <div className="text-xs text-gray-500 mt-0.5">Colonnes</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-faso-navy">
                  {selectedStats.columns && selectedStats.row_count
                    ? `${Math.round(
                        (selectedStats.columns.reduce(
                          (s: number, c: { null_count?: number }) =>
                            s + (selectedStats.row_count - (c.null_count ?? 0)),
                          0
                        ) /
                          (selectedStats.row_count * (selectedStats.columns.length || 1))) *
                          100
                      )}%`
                    : "—"}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">Complétude moy.</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Tendance dataset */}
              {selectedDataset && selectedTrend.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Tendance — {selectedDataset.name}
                  </p>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={selectedTrend} margin={{ top: 4, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gSV" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={NAVY} stopOpacity={0.12} />
                          <stop offset="95%" stopColor={NAVY} stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gSD" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={GREEN} stopOpacity={0.12} />
                          <stop offset="95%" stopColor={GREEN} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                      <Area type="monotone" dataKey="vues"            stroke={NAVY}  strokeWidth={2} fill="url(#gSV)" dot={false} activeDot={{ r: 4 }} />
                      <Area type="monotone" dataKey="telechargements" stroke={GREEN} strokeWidth={2} fill="url(#gSD)" dot={false} activeDot={{ r: 4 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Répartition types de colonnes */}
              {typeDist.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Types de colonnes
                  </p>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={typeDist} dataKey="value" nameKey="type" cx="50%" cy="50%"
                        outerRadius={65} innerRadius={35} paddingAngle={3}
                        label={({ type, percent }) => `${type} ${Math.round(percent * 100)}%`}
                        labelLine={false}
                      >
                        {typeDist.map((item) => (
                          <Cell key={item.type} fill={TYPE_COLORS[item.type] ?? "#94A3B8"} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => [`${v} colonne(s)`, ""]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Complétude par colonne */}
            {columnCompleteness.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Complétude par colonne (% de valeurs non-nulles)
                </p>
                <ResponsiveContainer width="100%" height={Math.max(180, columnCompleteness.length * 28)}>
                  <BarChart
                    data={columnCompleteness}
                    layout="vertical"
                    margin={{ top: 4, right: 40, left: 8, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`}
                      tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={120}
                      tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      formatter={(v: number, _name, props) => [
                        `${v}% (${props.payload.type})`,
                        props.payload.fullName,
                      ]}
                    />
                    <Bar dataKey="completude" radius={[0, 4, 4, 0]} barSize={14}>
                      {columnCompleteness.map((item: { name: string; fullName: string; type: string; completude: number }) => (
                        <Cell
                          key={item.name}
                          fill={item.completude === 100 ? GREEN : item.completude >= 90 ? TEAL : item.completude >= 70 ? GOLD : RED}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  {[
                    { color: GREEN, label: "100% — Complet" },
                    { color: TEAL,  label: "≥ 90%" },
                    { color: GOLD,  label: "≥ 70%" },
                    { color: RED,   label: "< 70% — Attention" },
                  ].map(({ color, label }) => (
                    <span key={label} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: color }} />
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
