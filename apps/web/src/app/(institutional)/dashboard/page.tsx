"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Download, Plus, AlertTriangle, Info, CheckCircle,
  FileText, TrendingUp, TrendingDown, X, ChevronDown,
  Database, Map as MapIcon, ShieldCheck, HeartPulse,
  Wheat, ClipboardCheck, Bell, Settings2, BarChart3,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { FocusTrap } from "@/components/ui/FocusTrap";
import { DataOriginBadge } from "@/components/ui/DataOriginBadge";
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

type DashboardAlertItem = {
  id: string;
  title: string;
  location: string;
  time: string;
  value: string;
  severity: "critical" | "warning" | "info";
};

function AlertItem({ title, location, time, value, severity }: DashboardAlertItem) {
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

// ── Type programme (correspond à ProgramOut de l'API) ────────────────────────
interface Programme {
  id: string;           // UUID
  name: string;
  description: string | null;
  sector: string;
  period: string;
  status: string;
  owner_id: string | null;
  metadata_json: {
    regions?: string[];
    debut?: string;
    fin?: string;
    objectif?: string;
    type_label?: string;
    [key: string]: unknown;
  } | null;
  created_at: string;
  updated_at: string;
}

interface DashboardKpi {
  key: "programs" | "price_observations" | "datasets" | "alerts";
  label: string;
  value: number | string;
  unit?: string | null;
  sub?: string | null;
  change: number;
  spark: number[];
}

interface DashboardOverview {
  updated_at: string;
  period: string;
  kpis: DashboardKpi[];
}

const EMPTY_KPIS: DashboardKpi[] = [
  { key: "programs", label: "Programmes actifs", value: 0, sub: "programmes suivis", change: 0, spark: [0, 0, 0, 0, 0, 0, 0, 0] },
  { key: "price_observations", label: "Observations prix", value: 0, sub: "0 nouvelles", change: 0, spark: [0, 0, 0, 0, 0, 0, 0, 0] },
  { key: "datasets", label: "Datasets publiés", value: 0, sub: "catalogue public", change: 0, spark: [0, 0, 0, 0, 0, 0, 0, 0] },
  { key: "alerts", label: "Alertes déclenchées", value: 0, sub: "seuils actifs", change: 0, spark: [0, 0, 0, 0, 0, 0, 0, 0] },
];

type DashboardPreferences = {
  domains: string[];
  dataTypes: string[];
  regions: string[];
};

type DashboardPreferencesApi = {
  id: string;
  user_id: string;
  domains: string[];
  data_types: string[];
  regions: string[];
  is_configured: boolean;
  created_at: string;
  updated_at: string;
};

type DashboardRecommendation = {
  key: string;
  title: string;
  text: string;
  href: string;
  kind: string;
  source: string;
  metric?: string | null;
  detail?: string | null;
  icon: "wheat" | "map" | "bell" | "database" | string;
};

type AlertRule = {
  id: string;
  name: string;
  metric_key: string;
  comparator: string;
  threshold_value: number;
  unit?: string | null;
  region?: string | null;
  severity: "critical" | "warning" | "info";
  status: "active" | "paused";
  created_at: string;
};

type DatasetListItem = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  source?: string | null;
  data_origin?: string | null;
  file_format?: string | null;
  row_count?: number | null;
  updated_at: string;
};

type DatasetListResponse = {
  items: DatasetListItem[];
  total: number;
};

type RegionSummary = {
  region: string;
  observations: number;
  avg_price: number;
  latest_date?: string | null;
};

const DEFAULT_PREFERENCES: DashboardPreferences = {
  domains: ["prices"],
  dataTypes: ["time_series", "maps"],
  regions: ["National"],
};

const DOMAIN_OPTIONS = [
  { id: "prices", label: "Prix alimentaires", description: "Céréales, marchés et tendances WFP", icon: Wheat },
  { id: "health", label: "Santé", description: "Vaccination, nutrition, accès aux soins", icon: HeartPulse },
  { id: "education", label: "Éducation", description: "Écoles, équipements, indicateurs élèves", icon: ClipboardCheck },
  { id: "water", label: "Eau & assainissement", description: "Accès, infrastructures, qualité", icon: ShieldCheck },
  { id: "territory", label: "Territoires", description: "Cartes, régions et zones d’intervention", icon: MapIcon },
];

const DATA_TYPE_OPTIONS = [
  { id: "time_series", label: "Séries temporelles" },
  { id: "maps", label: "Cartes" },
  { id: "alerts", label: "Alertes" },
  { id: "datasets", label: "Datasets publics" },
];

const WATCH_REGIONS = ["National", "Sahel", "Centre", "Est", "Hauts-Bassins", "Nord", "Centre-Nord", "Boucle du Mouhoun"];

const RECOMMENDATION_ICONS = {
  wheat: Wheat,
  map: MapIcon,
  bell: Bell,
  database: Database,
  health: HeartPulse,
  education: ClipboardCheck,
};

function toggleValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function toClientPreferences(preferences: DashboardPreferencesApi): DashboardPreferences {
  return {
    domains: preferences.domains,
    dataTypes: preferences.data_types,
    regions: preferences.regions,
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [showNouveauProg, setShowNouveauProg] = useState(false);
  const [isEditingPreferences, setIsEditingPreferences] = useState(false);
  const [draftPreferences, setDraftPreferences] = useState<DashboardPreferences>(DEFAULT_PREFERENCES);
  const { data: overview } = useQuery<DashboardOverview>({
    queryKey: ["dashboard-overview"],
    queryFn: async () => {
      const { data } = await api.get("/dashboard/overview");
      return data;
    },
    enabled: Boolean(user),
  });
  const { data: preferenceRecord } = useQuery<DashboardPreferencesApi>({
    queryKey: ["dashboard-preferences"],
    queryFn: async () => {
      const { data } = await api.get("/dashboard/preferences");
      return data;
    },
    enabled: Boolean(user),
  });
  const {
    data: recommendationData,
    isError: isRecommendationsError,
    isLoading: isRecommendationsLoading,
    refetch: refetchRecommendations,
  } = useQuery<DashboardRecommendation[]>({
    queryKey: ["dashboard-recommendations", preferenceRecord?.updated_at],
    queryFn: async () => {
      const { data } = await api.get("/dashboard/recommendations");
      return data;
    },
    enabled: Boolean(user),
  });
  const { data: alertRules = [] } = useQuery<AlertRule[]>({
    queryKey: ["dashboard-alert-rules", "active"],
    queryFn: async () => {
      const { data } = await api.get("/dashboard/alert-rules?status=active");
      return data;
    },
    enabled: Boolean(user),
  });
  const { data: publishedDatasets } = useQuery<DatasetListResponse>({
    queryKey: ["dashboard-recent-datasets"],
    queryFn: async () => {
      const { data } = await api.get("/datasets?page_size=5&status=published");
      return data;
    },
    enabled: Boolean(user),
  });
  const { data: regionSummary = [] } = useQuery<RegionSummary[]>({
    queryKey: ["dashboard-region-summary", preferenceRecord?.updated_at],
    queryFn: async () => {
      const { data } = await api.get("/dashboard/regions/summary");
      return data;
    },
    enabled: Boolean(user),
  });
  const savePreferencesMutation = useMutation({
    mutationFn: async (nextPreferences: DashboardPreferences) => {
      const { data } = await api.put("/dashboard/preferences", {
        domains: nextPreferences.domains,
        data_types: nextPreferences.dataTypes,
        regions: nextPreferences.regions,
      });
      return data as DashboardPreferencesApi;
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(["dashboard-preferences"], saved);
      queryClient.invalidateQueries({ queryKey: ["dashboard-overview"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-recommendations"] });
      setIsEditingPreferences(false);
      toast.success("Tableau de bord personnalisé");
    },
    onError: () => {
      toast.error("Impossible d’enregistrer les préférences");
    },
  });

  // ── Programmes depuis l'API ──────────────────────────────────────────────────
  const { data: programmesData = [], refetch: refetchPrograms } = useQuery<Programme[]>({
    queryKey: ["dashboard-programs"],
    queryFn: async () => {
      const { data } = await api.get("/dashboard/programs");
      // On exclut le programme "Suivi des prix alimentaires" créé automatiquement
      return (data as Programme[]).filter(
        (p) => !p.metadata_json?.default
      );
    },
    enabled: Boolean(user),
  });

  const createProgramMutation = useMutation({
    mutationFn: async (payload: {
      name: string; description?: string; sector: string;
      period: string; metadata_json: object;
    }) => {
      const { data } = await api.post("/dashboard/programs", payload);
      return data as Programme;
    },
    onSuccess: (created) => {
      queryClient.setQueryData<Programme[]>(["dashboard-programs"], (prev = []) => [created, ...prev]);
      queryClient.invalidateQueries({ queryKey: ["dashboard-overview"] });
      toast.success(`Programme "${created.name}" créé avec succès !`);
      setShowNouveauProg(false);
      setProg({ nom: "", type: "Sécurité alimentaire", regions: [], debut: "", fin: "", objectif: "" });
    },
    onError: () => {
      toast.error("Impossible de créer le programme");
    },
  });

  const hasPrograms = programmesData.length > 0;
  const preferences = preferenceRecord?.is_configured ? toClientPreferences(preferenceRecord) : null;
  const activePreferences = preferences ?? DEFAULT_PREFERENCES;
  const selectedDomainLabels = DOMAIN_OPTIONS
    .filter((domain) => activePreferences.domains.includes(domain.id))
    .map((domain) => domain.label);
  const selectedDataTypeLabels = DATA_TYPE_OPTIONS
    .filter((type) => activePreferences.dataTypes.includes(type.id))
    .map((type) => type.label);
  const displayedRecommendations = recommendationData ?? [];

  // Formulaire nouveau programme
  const [prog, setProg] = useState({
    nom: "", type: "Sécurité alimentaire", regions: [] as string[],
    debut: "", fin: "", objectif: "",
  });

  useEffect(() => {
    if (!preferenceRecord) return;
    setDraftPreferences(toClientPreferences(preferenceRecord));
  }, [preferenceRecord]);

  if (!user) return null;

  const firstName = (user.full_name ?? user.email).split(" ")[0] ?? "—";
  const kpis = overview?.kpis?.length ? overview.kpis : EMPTY_KPIS;
  const kpiByKey = Object.fromEntries(kpis.map((item) => [item.key, item])) as Record<DashboardKpi["key"], DashboardKpi>;

  const barData = regionSummary.slice(0, 12).map((r) => ({
    name: r.region.length > 10 ? r.region.slice(0, 9) + "." : r.region,
    observations: r.observations,
    prix: Math.round(r.avg_price),
  }));
  const maxRegionObservations = Math.max(...regionSummary.map((r) => r.observations), 0);
  const activeAlerts = alertRules.slice(0, 4).map((rule) => ({
    id: rule.id,
    title: rule.name,
    location: rule.region ?? "Toutes régions",
    time: rule.status === "active" ? "active" : "en pause",
    value: `${rule.comparator} ${rule.threshold_value.toLocaleString("fr-FR")} ${rule.unit ?? ""}`.trim(),
    severity: rule.severity,
  })) satisfies DashboardAlertItem[];
  const recentDatasets = publishedDatasets?.items ?? [];

  const handleExportRapport = () => {
    const rows = [
      ["Indicateur", "Valeur", "Sous-titre", "Variation"],
      ...kpis.map((item) => [
        item.label,
        String(item.value),
        item.sub ?? "",
        `${item.change >= 0 ? "+" : ""}${item.change}%`,
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "rapport_programmes_T1_2025.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("Rapport exporté");
  };

  const SECTOR_MAP: Record<string, string> = {
    "Sécurité alimentaire": "food_prices",
    "Santé communautaire":  "health",
    "Éducation rurale":     "education",
    "Eau & Assainissement": "water",
    "Agriculture":          "agriculture",
  };

  const handleCreateProg = () => {
    if (!prog.nom.trim()) { toast.error("Le nom du programme est requis"); return; }
    createProgramMutation.mutate({
      name:        prog.nom.trim(),
      description: prog.objectif.trim() || undefined,
      sector:      SECTOR_MAP[prog.type] ?? "food_prices",
      period:      "12m",
      metadata_json: {
        type_label: prog.type,
        regions:    prog.regions.length ? prog.regions : undefined,
        debut:      prog.debut   || undefined,
        fin:        prog.fin     || undefined,
        objectif:   prog.objectif.trim() || undefined,
      },
    });
  };

  const handleSavePreferences = () => {
    if (!draftPreferences.domains.length) {
      toast.error("Choisissez au moins un domaine de suivi");
      return;
    }
    if (!draftPreferences.dataTypes.length) {
      toast.error("Choisissez au moins un type de données");
      return;
    }
    const nextPreferences = {
      ...draftPreferences,
      regions: draftPreferences.regions.length ? draftPreferences.regions : ["National"],
    };
    savePreferencesMutation.mutate(nextPreferences);
  };

  const handleEditPreferences = () => {
    setDraftPreferences(preferences ?? DEFAULT_PREFERENCES);
    setIsEditingPreferences(true);
  };

  const PROG_TYPES = ["Sécurité alimentaire","Santé communautaire","Éducation rurale","Eau & Assainissement","Agriculture"];
  const REGIONS_SELECT = ["Sahel","Centre","Est","Hauts-Bassins","Nord","Centre-Nord","Boucle du Mouhoun","Cascades"];

  return (
    <div className="p-6 lg:p-8 space-y-6">

      {!hasPrograms && (!preferences || isEditingPreferences) && (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-[#1A2C42] text-white flex items-center justify-center">
                  <Settings2 className="w-4 h-4" />
                </span>
                <h2 className="font-bold text-gray-900">Personnaliser votre veille</h2>
              </div>
              <p className="text-sm text-gray-500 mt-2 max-w-2xl">
                Avant de créer un programme, choisissez les domaines, formats et régions que vous voulez suivre.
                Le dashboard affichera d’abord ces données ouvertes, puis ajoutera les statistiques de vos programmes.
              </p>
            </div>
            <button
              onClick={handleSavePreferences}
              disabled={savePreferencesMutation.isPending}
              className="px-4 py-2.5 bg-[#1A2C42] hover:bg-[#0f1e30] disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-colors shrink-0"
            >
              {savePreferencesMutation.isPending ? "Enregistrement..." : "Appliquer à mon dashboard"}
            </button>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Domaines d’intérêt</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-2">
                {DOMAIN_OPTIONS.map((domain) => {
                  const Icon = domain.icon;
                  const active = draftPreferences.domains.includes(domain.id);
                  return (
                    <button
                      key={domain.id}
                      type="button"
                      onClick={() => setDraftPreferences((prev) => ({ ...prev, domains: toggleValue(prev.domains, domain.id) }))}
                      className={cn(
                        "text-left border rounded-xl px-3 py-3 transition-colors",
                        active ? "border-[#1A2C42] bg-[#1A2C42]/5" : "border-gray-100 hover:border-gray-200"
                      )}
                    >
                      <span className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                        <Icon className={cn("w-4 h-4", active ? "text-[#E04E2F]" : "text-gray-400")} />
                        {domain.label}
                      </span>
                      <span className="block text-xs text-gray-400 mt-1">{domain.description}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Types de données</p>
              <div className="flex flex-wrap gap-2">
                {DATA_TYPE_OPTIONS.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setDraftPreferences((prev) => ({ ...prev, dataTypes: toggleValue(prev.dataTypes, type.id) }))}
                    className={cn(
                      "px-3 py-2 rounded-lg text-xs font-semibold border transition-colors",
                      draftPreferences.dataTypes.includes(type.id)
                        ? "bg-[#E04E2F] text-white border-[#E04E2F]"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                    )}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Zones à suivre</p>
              <div className="flex flex-wrap gap-2">
                {WATCH_REGIONS.map((region) => (
                  <button
                    key={region}
                    type="button"
                    onClick={() => setDraftPreferences((prev) => ({ ...prev, regions: toggleValue(prev.regions, region) }))}
                    className={cn(
                      "px-3 py-2 rounded-lg text-xs font-semibold border transition-colors",
                      draftPreferences.regions.includes(region)
                        ? "bg-[#1A2C42] text-white border-[#1A2C42]"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                    )}
                  >
                    {region}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {!hasPrograms && preferences && !isEditingPreferences && (
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 bg-white border border-gray-100 rounded-2xl shadow-sm px-5 py-4">
          <div className="w-9 h-9 rounded-xl bg-green-50 text-[#16A34A] flex items-center justify-center shrink-0">
            <CheckCircle className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900">Votre dashboard suit {selectedDomainLabels.join(", ") || "vos priorités de données"}.</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Données attendues : {selectedDataTypeLabels.join(", ")} · Zones : {activePreferences.regions.join(", ")}.
            </p>
          </div>
          <button
            onClick={handleEditPreferences}
            className="px-3 py-2 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50"
          >
            Modifier
          </button>
        </div>
      )}

      {/* En-tête */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {hasPrograms ? (
              <span className="text-xs font-semibold text-white bg-[#1A2C42] px-3 py-1 rounded-full">
                {programmesData.length} programme{programmesData.length > 1 ? "s" : ""} actif{programmesData.length > 1 ? "s" : ""}
              </span>
            ) : (
              <span className="text-xs font-semibold text-[#1A2C42] bg-[#1A2C42]/5 border border-[#1A2C42]/10 px-3 py-1 rounded-full">
                Veille personnalisée
              </span>
            )}
            <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              {overview?.period ?? "30 derniers jours"}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mt-2 leading-tight">
            Bonjour {firstName}.{" "}
            <span className="hidden sm:inline">
              {hasPrograms ? "Voici le pouls de vos programmes." : "Voici votre veille FasoData."}
            </span>
          </h1>
          {!hasPrograms && (
            <p className="text-gray-400 text-sm mt-1 hidden sm:block">
              {preferences
                ? "Les indicateurs ci-dessous privilégient vos domaines d’intérêt."
                : "Répondez aux questions de démarrage pour orienter votre dashboard."}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Export masqué sur mobile pour gagner de la place */}
          <button
            onClick={handleExportRapport}
            className="hidden sm:flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors bg-white">
            <Download className="w-4 h-4" />
            <span className="hidden lg:inline">Exporter rapport</span>
          </button>
          <button
            onClick={() => setShowNouveauProg(true)}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-[#1A2C42] hover:bg-[#0f1e30] text-white rounded-xl text-sm font-semibold transition-colors">
            <Plus className="w-4 h-4" />
            <span className="hidden xs:inline">Nouveau programme</span>
            <span className="xs:hidden">Nouveau</span>
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label={kpiByKey.programs.label}
          value={kpiByKey.programs.value}
          sub={kpiByKey.programs.sub ?? undefined}
          unit={kpiByKey.programs.unit ?? undefined}
          change={kpiByKey.programs.change}
          sparkData={kpiByKey.programs.spark}
          color="#16A34A"
        />
        <KpiCard
          label={kpiByKey.price_observations.label}
          value={kpiByKey.price_observations.value}
          sub={kpiByKey.price_observations.sub ?? undefined}
          unit={kpiByKey.price_observations.unit ?? undefined}
          change={kpiByKey.price_observations.change}
          sparkData={kpiByKey.price_observations.spark}
          color="#16A34A"
        />
        <KpiCard
          label={kpiByKey.datasets.label}
          value={kpiByKey.datasets.value}
          sub={kpiByKey.datasets.sub ?? undefined}
          unit={kpiByKey.datasets.unit ?? undefined}
          change={kpiByKey.datasets.change}
          sparkData={kpiByKey.datasets.spark}
          color="#E04E2F"
        />
        <KpiCard
          label={kpiByKey.alerts.label}
          value={kpiByKey.alerts.value}
          sub={kpiByKey.alerts.sub ?? undefined}
          unit={kpiByKey.alerts.unit ?? undefined}
          change={kpiByKey.alerts.change}
          sparkData={kpiByKey.alerts.spark}
          color="#16A34A"
        />
      </div>

      {/* Mes programmes (si au moins 1 créé) */}
      {hasPrograms && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-1 h-4 bg-[#1A2C42] rounded-full block" />
              <h2 className="font-bold text-gray-900 text-sm">Mes programmes</h2>
            </div>
            <button onClick={() => setShowNouveauProg(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1A2C42] text-white rounded-lg text-xs font-semibold">
              <Plus className="w-3 h-3" /> Nouveau
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {programmesData.map((p) => {
              const regions = p.metadata_json?.regions ?? [];
              const objectif = p.metadata_json?.objectif ?? p.description;
              const typeLabel = p.metadata_json?.type_label ?? p.sector;
              return (
                <div key={p.id} className="border border-gray-100 rounded-xl p-4 hover:border-[#1A2C42]/20 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm font-semibold text-gray-900 leading-snug">{p.name}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                      p.status === "active" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                    }`}>
                      {p.status === "active" ? "Actif" : p.status === "paused" ? "Pause" : "Archivé"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">{typeLabel}</p>
                  {regions.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">{regions.slice(0, 2).join(", ")}{regions.length > 2 ? ` +${regions.length - 2}` : ""}</p>
                  )}
                  {objectif && <p className="text-xs text-[#E04E2F] font-medium mt-1.5">🎯 {objectif}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {hasPrograms ? (
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-1 h-4 bg-[#E04E2F] rounded-full block" />
                  <h2 className="font-bold text-gray-900 text-sm">Indicateurs terrain disponibles</h2>
                </div>
                <p className="text-xs text-gray-400 mt-0.5 ml-3">Synthèse issue des observations prix en base</p>
              </div>
              <div className="flex items-center gap-2">
                <Link href="/dashboard/prix" className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50">
                  Voir prix
                </Link>
              </div>
            </div>

            <div className="flex items-center gap-5 mb-3 ml-1">
              <span className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="w-3 h-3 rounded-sm bg-[#E04E2F] block" /> Observations
              </span>
              <span className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="w-3 h-3 rounded-sm bg-[#1A2C42] block" /> Prix moyen
              </span>
            </div>

            {barData.length ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E5E7EB", boxShadow: "0 1px 8px rgba(0,0,0,0.08)" }}
                    formatter={(v: number, name: string) => [v, name === "observations" ? "Observations" : "Prix moyen"]}
                  />
                  <Bar dataKey="observations" fill="#E04E2F" radius={[3, 3, 0, 0]} barSize={14} />
                  <Bar dataKey="prix" fill="#1A2C42" radius={[3, 3, 0, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex flex-col items-center justify-center text-center text-gray-400">
                <BarChart3 className="w-8 h-8 mb-2 text-gray-300" />
                <p className="text-sm font-medium text-gray-600">Aucun indicateur terrain disponible</p>
                <p className="text-xs mt-1">Les graphiques apparaîtront après ingestion ou agrégation de données vérifiées.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-1 h-4 bg-[#E04E2F] rounded-full block" />
                  <h2 className="font-bold text-gray-900 text-sm">Données recommandées</h2>
                </div>
                <p className="text-xs text-gray-400 mt-0.5 ml-3">Sélectionnées selon vos priorités de veille</p>
              </div>
              <Link href="/datasets" className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50">
                Catalogue
              </Link>
            </div>
            {isRecommendationsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[0, 1, 2, 3].map((item) => (
                  <div key={item} className="border border-gray-100 rounded-xl p-4 animate-pulse">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-8 h-8 rounded-lg bg-gray-100" />
                      <span className="h-4 w-40 bg-gray-100 rounded" />
                    </div>
                    <div className="space-y-2">
                      <span className="block h-3 w-full bg-gray-100 rounded" />
                      <span className="block h-3 w-2/3 bg-gray-100 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : isRecommendationsError ? (
              <div className="py-10 text-center text-gray-400 border border-dashed border-gray-200 rounded-xl">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-amber-400" />
                <p className="text-sm font-medium text-gray-600">Recommandations indisponibles</p>
                <p className="text-xs mt-1">L'API n'a pas pu charger les recommandations personnalisées.</p>
                <button
                  type="button"
                  onClick={() => refetchRecommendations()}
                  className="inline-flex mt-3 text-xs font-semibold text-[#E04E2F] hover:underline"
                >
                  Réessayer
                </button>
              </div>
            ) : displayedRecommendations.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {displayedRecommendations.map((item) => {
                  const Icon = RECOMMENDATION_ICONS[item.icon as keyof typeof RECOMMENDATION_ICONS] ?? Database;
                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      className="border border-gray-100 rounded-xl p-4 hover:border-[#1A2C42]/20 hover:bg-gray-50/60 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-8 h-8 rounded-lg bg-[#1A2C42]/5 text-[#1A2C42] flex items-center justify-center shrink-0">
                            <Icon className="w-4 h-4" />
                          </span>
                          <p className="text-sm font-semibold text-gray-900 leading-snug">{item.title}</p>
                        </div>
                        {item.metric && (
                          <span className="text-[10px] font-bold text-[#E04E2F] bg-red-50 px-2 py-1 rounded-lg shrink-0">
                            {item.metric}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 leading-relaxed">{item.text}</p>
                      <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-gray-50">
                        <span className="text-[10px] text-gray-400 truncate">{item.source}</span>
                        {item.detail && <span className="text-[10px] font-medium text-gray-500 truncate">{item.detail}</span>}
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="py-10 text-center text-gray-400 border border-dashed border-gray-200 rounded-xl">
                <Database className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm font-medium text-gray-600">Aucune recommandation disponible</p>
                <p className="text-xs mt-1">Ajoutez des préférences ou publiez des données vérifiées correspondant à vos priorités.</p>
                <button
                  type="button"
                  onClick={() => setIsEditingPreferences(true)}
                  className="inline-flex mt-3 text-xs font-semibold text-[#E04E2F] hover:underline"
                >
                  Modifier mes préférences
                </button>
              </div>
            )}
          </div>
        )}

        {/* Alertes actives */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-1 h-4 bg-[#E04E2F] rounded-full block" />
              <h2 className="font-bold text-gray-900 text-sm">Alertes actives</h2>
            </div>
            <span className="text-xs font-semibold text-[#E04E2F] bg-red-50 px-2 py-0.5 rounded-full">
              {activeAlerts.length} active{activeAlerts.length > 1 ? "s" : ""}
            </span>
          </div>
          {activeAlerts.length ? (
            <div>
              {activeAlerts.map((a) => <AlertItem key={a.id} {...a} />)}
            </div>
          ) : (
            <div className="py-10 text-center text-gray-400">
              <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm font-medium text-gray-600">Aucune règle active</p>
              <p className="text-xs mt-1">Créez une règle pour déclencher des alertes réelles.</p>
              <Link href="/dashboard/alertes" className="inline-flex mt-3 text-xs font-semibold text-[#E04E2F] hover:underline">
                Configurer les alertes
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {hasPrograms ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-1 h-4 bg-[#16A34A] rounded-full block" />
              <h2 className="font-bold text-gray-900 text-sm">Répartition géographique</h2>
              <span className="text-xs text-gray-400 ml-1">Observations prix par région</span>
            </div>
            {regionSummary.length ? (
              <div className="space-y-2.5">
                {regionSummary.slice(0, 7).map((r) => {
                return (
                  <div key={r.region} className="flex items-center gap-3">
                    <span className="text-xs text-gray-600 w-28 shrink-0 truncate">{r.region}</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#E04E2F]"
                        style={{ width: `${maxRegionObservations ? (r.observations / maxRegionObservations) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-gray-700 w-12 text-right">
                      {r.observations.toLocaleString("fr-FR")}
                    </span>
                    <span className="text-[10px] text-gray-400 w-16 text-right">
                      {Math.round(r.avg_price).toLocaleString("fr-FR")} CFA
                    </span>
                  </div>
                );
                })}
              </div>
            ) : (
              <div className="py-10 text-center text-gray-400">
                <MapIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm font-medium text-gray-600">Aucune donnée régionale</p>
                <p className="text-xs mt-1">La répartition apparaîtra après collecte ou import de données vérifiées.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-1 h-4 bg-[#16A34A] rounded-full block" />
              <h2 className="font-bold text-gray-900 text-sm">Priorités de veille</h2>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Domaines</p>
                <div className="flex flex-wrap gap-2">
                  {(selectedDomainLabels.length ? selectedDomainLabels : ["Prix alimentaires"]).map((label) => (
                    <span key={label} className="px-3 py-1.5 rounded-lg bg-[#1A2C42]/5 text-[#1A2C42] text-xs font-semibold">
                      {label}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Formats utiles</p>
                <div className="flex flex-wrap gap-2">
                  {(selectedDataTypeLabels.length ? selectedDataTypeLabels : ["Séries temporelles"]).map((label) => (
                    <span key={label} className="px-3 py-1.5 rounded-lg bg-gray-50 text-gray-600 text-xs font-semibold">
                      {label}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Régions</p>
                <p className="text-sm text-gray-700">{activePreferences.regions.join(", ")}</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-1 h-4 bg-[#16A34A] rounded-full block" />
              <h2 className="font-bold text-gray-900 text-sm">{hasPrograms ? "Datasets publiés récemment" : "Prochaines actions"}</h2>
            </div>
            {hasPrograms && <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">Catalogue public</span>}
          </div>
          <div className="space-y-1">
            {hasPrograms ? (
              recentDatasets.length ? (
                recentDatasets.map((dataset) => {
                  const format = (dataset.file_format ?? "dataset").toUpperCase();
                  return (
                    <Link
                      key={dataset.id}
                      href={`/datasets/${dataset.slug}`}
                      className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0 group hover:bg-gray-50/50 -mx-2 px-2 rounded-xl transition-colors"
                    >
                      <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center shrink-0">
                        <FileText className="w-3.5 h-3.5 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate">{dataset.name}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {dataset.source ?? "FasoData"} · {dataset.row_count?.toLocaleString("fr-FR") ?? "0"} lignes
                        </p>
                        <DataOriginBadge origin={dataset.data_origin} compact className="mt-1" />
                      </div>
                      <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0", FORMAT_COLORS[format] ?? "bg-gray-100 text-gray-500")}>
                        {format}
                      </span>
                    </Link>
                  );
                })
              ) : (
                <div className="py-10 text-center text-gray-400">
                  <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm font-medium text-gray-600">Aucun dataset vérifié publié</p>
                  <p className="text-xs mt-1">Les publications récentes vérifiées apparaîtront ici.</p>
                </div>
              )
            ) : (
              [
                { title: "Créer une règle d’alerte", text: "Recevoir un signal sur un seuil prix, météo ou dataset.", href: "/dashboard/alertes", icon: Bell },
                { title: "Explorer le catalogue", text: "Trouver les datasets publics correspondant à votre veille.", href: "/datasets", icon: Database },
                { title: "Créer un programme", text: "Ajouter vos indicateurs terrain au dashboard.", href: "#programme", icon: Plus },
              ].map((action) => {
                const Icon = action.icon;
                const content = (
                  <>
                    <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center shrink-0">
                      <Icon className="w-3.5 h-3.5 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-800">{action.title}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{action.text}</p>
                    </div>
                  </>
                );
                return action.href === "#programme" ? (
                  <button
                    key={action.title}
                    type="button"
                    onClick={() => setShowNouveauProg(true)}
                    className="w-full text-left flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 -mx-2 px-2 rounded-xl transition-colors"
                  >
                    {content}
                  </button>
                ) : (
                  <Link
                    key={action.title}
                    href={action.href}
                    className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 -mx-2 px-2 rounded-xl transition-colors"
                  >
                    {content}
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── Modal : Nouveau programme ──────────────────────────────────────── */}
      {showNouveauProg && (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center"><button type="button" className="absolute inset-0 bg-black/50" onClick={() => setShowNouveauProg(false)} aria-label="Fermer la modale" /><FocusTrap onEscape={() => setShowNouveauProg(false)} labelledBy="program-modal-title" className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-y-auto max-h-[90vh]"><div className="flex items-center justify-between px-6 py-4 border-b border-gray-100"><h2 id="program-modal-title" className="font-bold text-gray-900">Créer un nouveau programme</h2><button type="button" onClick={() => setShowNouveauProg(false)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg" aria-label="Fermer"><X className="w-4 h-4" /></button></div><div className="px-6 py-5">
        <div className="space-y-4">
          <div>
            <label htmlFor="program-name" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Nom du programme <span className="text-[#E04E2F]">*</span>
            </label>
            <input id="program-name" type="text" value={prog.nom}
              onChange={(e) => setProg((p) => ({ ...p, nom: e.target.value }))}
              placeholder="ex: Nutrition Sahel 2025"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A2C42]/20" />
          </div>

          <div>
            <label htmlFor="program-type" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Type</label>
            <div className="relative">
              <select id="program-type" value={prog.type} onChange={(e) => setProg((p) => ({ ...p, type: e.target.value }))}
                className="w-full appearance-none px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A2C42]/20">
                {PROG_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <span id="program-regions-label" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Régions ciblées</span>
            <div className="flex flex-wrap gap-2" role="group" aria-labelledby="program-regions-label">
              {REGIONS_SELECT.map((r) => (
                <button key={r} type="button"
                  onClick={() => setProg((p) => ({
                    ...p,
                    regions: p.regions.includes(r) ? p.regions.filter((x) => x !== r) : [...p.regions, r],
                  }))}
                  aria-pressed={prog.regions.includes(r)}
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
              <label htmlFor="program-start" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Début</label>
              <input id="program-start" type="date" value={prog.debut}
                onChange={(e) => setProg((p) => ({ ...p, debut: e.target.value }))}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A2C42]/20" />
            </div>
            <div>
              <label htmlFor="program-end" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Fin</label>
              <input id="program-end" type="date" value={prog.fin}
                onChange={(e) => setProg((p) => ({ ...p, fin: e.target.value }))}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A2C42]/20" />
            </div>
          </div>

          <div>
            <label htmlFor="program-goal" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Objectif chiffré</label>
            <input id="program-goal" type="text" value={prog.objectif}
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
              disabled={createProgramMutation.isPending}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#1A2C42] hover:bg-[#0f1e30] disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-colors">
              {createProgramMutation.isPending
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Création...</>
                : <><Plus className="w-4 h-4" /> Créer le programme</>}
            </button>
          </div>
        </div>
      </div></FocusTrap></div>
      )}
    </div>
  );
}
