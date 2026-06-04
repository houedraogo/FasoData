"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle, Info, CheckCircle, Bell, Filter, Archive,
  Plus, X, ChevronDown, Loader2, RefreshCw, Trash2, Pause, Play,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

// ── Types ─────────────────────────────────────────────────────────────────────

type Severity = "critical" | "warning" | "info";

interface AlertItem {
  id: number | string;
  title: string;
  location: string;
  time: string;
  value: string;
  severity: Severity;
}

interface AlertRule {
  id: string;
  name: string;
  metric_key: string;
  comparator: string;
  threshold_value: number;
  unit: string | null;
  region: string | null;
  severity: Severity;
  status: "active" | "paused";
  created_at: string;
}

type FilterKey = "all" | "critical" | "warning" | "info";

// ── Config visuelle ───────────────────────────────────────────────────────────

const SEVERITY_CFG: Record<Severity, {
  icon: typeof AlertTriangle; color: string; bg: string; label: string; badge: string;
}> = {
  critical: { icon: AlertTriangle, color: "text-[#E04E2F]",  bg: "bg-red-50 border-red-100",    label: "Critique",    badge: "bg-red-100 text-[#E04E2F]" },
  warning:  { icon: AlertTriangle, color: "text-[#D97706]",  bg: "bg-amber-50 border-amber-100", label: "Attention",   badge: "bg-amber-100 text-[#D97706]" },
  info:     { icon: Info,          color: "text-[#2563EB]",  bg: "bg-blue-50 border-blue-100",   label: "Information", badge: "bg-blue-100 text-[#2563EB]" },
};

const METRICS = [
  { key: "price_mais",    label: "Prix maïs (CFA/kg)" },
  { key: "price_mil",     label: "Prix mil (CFA/kg)" },
  { key: "price_sorgho",  label: "Prix sorgho (CFA/kg)" },
  { key: "price_riz",     label: "Prix riz local (CFA/kg)" },
  { key: "price_niebe",   label: "Prix niébé (CFA/kg)" },
];

const REGIONS_LIST = [
  "National","Sahel","Centre","Est","Hauts-Bassins","Nord",
  "Centre-Nord","Boucle du Mouhoun","Plateau Central","Centre-Ouest",
  "Centre-Sud","Centre-Est","Sud-Ouest","Cascades",
];

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AlertesPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter]       = useState<FilterKey>("all");
  const [archived, setArchived]   = useState<Set<string | number>>(new Set());
  const [showNewRule, setShowNewRule] = useState(false);

  // Formulaire nouvelle règle
  const [newRule, setNewRule] = useState({
    name: "", metric_key: "price_mais", comparator: ">",
    threshold_value: "", unit: "CFA/kg", region: "National",
    severity: "warning" as Severity,
  });

  // ── Requêtes API ─────────────────────────────────────────────────────────

  const { data: alertsData, isLoading: loadingFeed, refetch } = useQuery<{
    items: AlertItem[]; rules: unknown[];
  }>({
    queryKey: ["dashboard-alerts-feed"],
    queryFn: async () => {
      const { data } = await api.get("/dashboard/alerts");
      return data;
    },
    staleTime: 60_000,
  });

  const { data: rulesData = [], isLoading: loadingRules } = useQuery<AlertRule[]>({
    queryKey: ["dashboard-alert-rules"],
    queryFn: async () => {
      const { data } = await api.get("/dashboard/alert-rules");
      return data;
    },
  });

  const createRuleMutation = useMutation({
    mutationFn: async (payload: object) => {
      const { data } = await api.post("/dashboard/alert-rules", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-alert-rules"] });
      toast.success("Règle d'alerte créée");
      setShowNewRule(false);
      setNewRule({ name: "", metric_key: "price_mais", comparator: ">", threshold_value: "", unit: "CFA/kg", region: "National", severity: "warning" });
    },
    onError: () => toast.error("Impossible de créer la règle"),
  });

  const toggleRuleMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "active" | "paused" }) => {
      const { data } = await api.patch(`/dashboard/alert-rules/${id}`, { status });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dashboard-alert-rules"] }),
    onError: () => toast.error("Impossible de modifier la règle"),
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/dashboard/alert-rules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-alert-rules"] });
      toast.success("Règle supprimée");
    },
    onError: () => toast.error("Impossible de supprimer la règle"),
  });

  // ── Données filtrées ──────────────────────────────────────────────────────

  const allItems: AlertItem[] = alertsData?.items ?? [];
  const visible = allItems.filter(
    (a) => !archived.has(a.id) && (filter === "all" || a.severity === filter)
  );

  const counts = {
    all:      allItems.filter((a) => !archived.has(a.id)).length,
    critical: allItems.filter((a) => a.severity === "critical" && !archived.has(a.id)).length,
    warning:  allItems.filter((a) => a.severity === "warning"  && !archived.has(a.id)).length,
    info:     allItems.filter((a) => a.severity === "info"     && !archived.has(a.id)).length,
  };

  const handleCreateRule = () => {
    if (!newRule.name.trim())             { toast.error("Nom requis"); return; }
    if (!newRule.threshold_value)         { toast.error("Seuil requis"); return; }
    if (isNaN(Number(newRule.threshold_value))) { toast.error("Seuil invalide"); return; }
    createRuleMutation.mutate({
      name:            newRule.name.trim(),
      metric_key:      newRule.metric_key,
      comparator:      newRule.comparator,
      threshold_value: Number(newRule.threshold_value),
      unit:            newRule.unit || null,
      region:          newRule.region || null,
      severity:        newRule.severity,
      channels:        ["email"],
    });
  };

  // ── Rendu ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">

      {/* En-tête */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Alertes</h1>
          {!loadingFeed && (
            <p className="text-sm text-gray-500 mt-1">
              <strong className="text-[#E04E2F]">{counts.critical}</strong> critiques ·{" "}
              <strong className="text-[#D97706]">{counts.warning}</strong> avertissements ·{" "}
              <strong className="text-[#2563EB]">{counts.info}</strong> informations
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setShowNewRule(true)}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-[#1A2C42] hover:bg-[#0f1e30] text-white rounded-xl text-sm font-semibold transition-colors">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nouvelle règle</span>
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {(["all", "critical", "warning", "info"] as FilterKey[]).map((key) => (
          <button key={key} onClick={() => setFilter(key)}
            className={cn(
              "px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors border whitespace-nowrap",
              filter === key ? "bg-[#1A2C42] text-white border-[#1A2C42]"
                            : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
            )}>
            {key === "all" ? "Toutes" : SEVERITY_CFG[key as Severity].label}
            <span className={cn("ml-1.5 text-xs font-bold",
              filter === key ? "text-white/70" : "text-gray-400")}>
              {counts[key]}
            </span>
          </button>
        ))}
      </div>

      {/* Feed alertes */}
      <div className="space-y-3">
        {loadingFeed ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-white rounded-2xl border border-gray-100 animate-pulse" />
          ))
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-gray-100">
            <CheckCircle className="w-10 h-10 text-[#16A34A] mb-3" />
            <p className="font-medium text-gray-700">Aucune alerte active</p>
            <p className="text-sm text-gray-400 mt-1">
              {filter === "all" ? "Toutes vos alertes ont été traitées." : `Aucune alerte de type "${SEVERITY_CFG[filter as Severity]?.label}".`}
            </p>
          </div>
        ) : visible.map((alert) => {
          const cfg  = SEVERITY_CFG[alert.severity];
          const Icon = cfg.icon;
          return (
            <div key={alert.id}
              className={cn("flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl border", cfg.bg)}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 bg-white shadow-sm">
                <Icon className={cn("w-4 h-4", cfg.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-900 text-sm">{alert.title}</p>
                  <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", cfg.badge)}>
                    {cfg.label}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{alert.location} · {alert.time}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={cn("text-sm font-bold hidden sm:block", cfg.color)}>{alert.value}</span>
                <button onClick={() => setArchived((prev) => new Set([...prev, alert.id]))}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors"
                  title="Archiver">
                  <Archive className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Règles d'alerte configurées */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#E04E2F]" />
            <h2 className="font-bold text-gray-900 text-sm">Règles configurées</h2>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {loadingRules ? "…" : rulesData.length}
            </span>
          </div>
          <button onClick={() => setShowNewRule(true)}
            className="text-xs font-semibold text-[#1A2C42] hover:text-[#0f1e30] flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> Ajouter
          </button>
        </div>

        {loadingRules ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : rulesData.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center px-4">
            <Bell className="w-8 h-8 text-gray-200 mb-3" />
            <p className="text-sm text-gray-600 font-medium">Aucune règle configurée</p>
            <p className="text-xs text-gray-400 mt-1">Créez une règle pour être alerté quand un seuil est dépassé.</p>
            <button onClick={() => setShowNewRule(true)}
              className="mt-4 px-4 py-2 bg-[#1A2C42] text-white rounded-xl text-xs font-semibold">
              Créer la première règle
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {rulesData.map((rule) => {
              const sev = SEVERITY_CFG[rule.severity] ?? SEVERITY_CFG.warning;
              const isActive = rule.status === "active";
              return (
                <div key={rule.id}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
                  <span className={cn("w-2 h-2 rounded-full shrink-0",
                    isActive ? "bg-[#16A34A]" : "bg-gray-300")} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{rule.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {rule.comparator} {rule.threshold_value.toLocaleString("fr-FR")} {rule.unit ?? ""}
                      {rule.region ? ` · ${rule.region}` : ""}
                    </p>
                  </div>
                  <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full hidden sm:block", sev.badge)}>
                    {sev.label}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleRuleMutation.mutate({ id: rule.id, status: isActive ? "paused" : "active" })}
                      title={isActive ? "Mettre en pause" : "Activer"}
                      className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                      {isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => { if (confirm("Supprimer cette règle ?")) deleteRuleMutation.mutate(rule.id); }}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal nouvelle règle */}
      {showNewRule && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowNewRule(false)} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h2 className="font-bold text-gray-900">Nouvelle règle d'alerte</h2>
              <button onClick={() => setShowNewRule(false)}
                className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Nom de la règle <span className="text-[#E04E2F]">*</span>
                </label>
                <input type="text" value={newRule.name}
                  onChange={(e) => setNewRule((p) => ({ ...p, name: e.target.value }))}
                  placeholder="ex: Prix maïs Sahel > 320"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A2C42]/20" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Indicateur</label>
                  <div className="relative">
                    <select value={newRule.metric_key}
                      onChange={(e) => setNewRule((p) => ({ ...p, metric_key: e.target.value }))}
                      className="w-full appearance-none px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A2C42]/20">
                      {METRICS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Région</label>
                  <div className="relative">
                    <select value={newRule.region}
                      onChange={(e) => setNewRule((p) => ({ ...p, region: e.target.value }))}
                      className="w-full appearance-none px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A2C42]/20">
                      {REGIONS_LIST.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Condition</label>
                  <select value={newRule.comparator}
                    onChange={(e) => setNewRule((p) => ({ ...p, comparator: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none">
                    <option value=">">{">"} supérieur</option>
                    <option value="<">{"<"} inférieur</option>
                    <option value=">=">≥ sup. ou égal</option>
                    <option value="<=">≤ inf. ou égal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Seuil</label>
                  <input type="number" value={newRule.threshold_value}
                    onChange={(e) => setNewRule((p) => ({ ...p, threshold_value: e.target.value }))}
                    placeholder="320"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A2C42]/20" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Unité</label>
                  <input type="text" value={newRule.unit}
                    onChange={(e) => setNewRule((p) => ({ ...p, unit: e.target.value }))}
                    placeholder="CFA/kg"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Sévérité</label>
                <div className="flex gap-2">
                  {(["info", "warning", "critical"] as Severity[]).map((s) => (
                    <button key={s} type="button"
                      onClick={() => setNewRule((p) => ({ ...p, severity: s }))}
                      className={cn("flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors",
                        newRule.severity === s
                          ? s === "critical" ? "bg-red-50 border-red-200 text-[#E04E2F]"
                          : s === "warning"  ? "bg-amber-50 border-amber-200 text-[#D97706]"
                          : "bg-blue-50 border-blue-200 text-[#2563EB]"
                          : "border-gray-200 text-gray-500 hover:border-gray-300")}>
                      {SEVERITY_CFG[s].label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button onClick={() => setShowNewRule(false)}
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
                  Annuler
                </button>
                <button onClick={handleCreateRule}
                  disabled={createRuleMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#1A2C42] hover:bg-[#0f1e30] disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-colors">
                  {createRuleMutation.isPending
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Création...</>
                    : <><Bell className="w-4 h-4" /> Créer la règle</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
