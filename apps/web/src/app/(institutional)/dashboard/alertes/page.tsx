"use client";

import { useState } from "react";
import { AlertTriangle, Info, CheckCircle, Bell, Filter, Archive } from "lucide-react";
import { ALERTS } from "@/lib/mockData";
import { cn } from "@/lib/utils";

const ALL_ALERTS = [
  ...ALERTS,
  { id: 5, title: "Données INSD mises à jour",           location: "National",           time: "il y a 6h",   value: "v3.2",          severity: "info" as const },
  { id: 6, title: "Seuil paludisme dépassé",             location: "Sahel · 3 districts",time: "il y a 8h",   value: "+340 cas",      severity: "critical" as const },
  { id: 7, title: "Export rapport T1 disponible",        location: "Votre organisation", time: "il y a 12h",  value: "Prêt",          severity: "info" as const },
  { id: 8, title: "Couverture nutritionnelle critique",  location: "Nord · Titao",        time: "il y a 1j",   value: "28%",           severity: "warning" as const },
];

const SEVERITY_CFG = {
  critical: { icon: AlertTriangle, color: "text-[#E04E2F]",  bg: "bg-red-50 border-red-100",   dot: "bg-[#E04E2F]", label: "Critique" },
  warning:  { icon: AlertTriangle, color: "text-[#D97706]",  bg: "bg-amber-50 border-amber-100",dot: "bg-[#D97706]", label: "Attention" },
  info:     { icon: Info,          color: "text-[#2563EB]",  bg: "bg-blue-50 border-blue-100",  dot: "bg-[#2563EB]", label: "Info" },
};

type FilterKey = "all" | "critical" | "warning" | "info";

export default function AlertesPage() {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [archived, setArchived] = useState<Set<number>>(new Set());

  const visible = ALL_ALERTS.filter(
    (a) => !archived.has(a.id) && (filter === "all" || a.severity === filter)
  );

  const counts = {
    all:      ALL_ALERTS.filter((a) => !archived.has(a.id)).length,
    critical: ALL_ALERTS.filter((a) => a.severity === "critical" && !archived.has(a.id)).length,
    warning:  ALL_ALERTS.filter((a) => a.severity === "warning"  && !archived.has(a.id)).length,
    info:     ALL_ALERTS.filter((a) => a.severity === "info"     && !archived.has(a.id)).length,
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">

      {/* En-tête */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alertes</h1>
          <p className="text-sm text-gray-500 mt-1">
            <strong className="text-[#E04E2F]">{counts.critical}</strong> critiques ·{" "}
            <strong className="text-[#D97706]">{counts.warning}</strong> avertissements ·{" "}
            <strong className="text-[#2563EB]">{counts.info}</strong> informations
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 bg-white">
          <Filter className="w-4 h-4" /> Configurer alertes
        </button>
      </div>

      {/* Filtres */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "critical", "warning", "info"] as FilterKey[]).map((key) => (
          <button key={key}
            onClick={() => setFilter(key)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium transition-colors border",
              filter === key
                ? "bg-[#1A2C42] text-white border-[#1A2C42]"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
            )}>
            {key === "all" ? "Toutes" : SEVERITY_CFG[key].label}
            <span className={cn("ml-2 text-xs font-bold",
              filter === key ? "text-white/70" : "text-gray-400")}>
              {counts[key]}
            </span>
          </button>
        ))}
      </div>

      {/* Liste */}
      <div className="space-y-3">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-gray-100">
            <CheckCircle className="w-10 h-10 text-[#16A34A] mb-3" />
            <p className="font-medium text-gray-700">Aucune alerte active</p>
            <p className="text-sm text-gray-400 mt-1">Toutes vos alertes ont été traitées.</p>
          </div>
        ) : visible.map((alert) => {
          const cfg = SEVERITY_CFG[alert.severity];
          const Icon = cfg.icon;
          return (
            <div key={alert.id}
              className={cn("flex items-start gap-4 p-4 rounded-2xl border", cfg.bg)}>
              <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 bg-white shadow-sm")}>
                <Icon className={cn("w-4 h-4", cfg.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-900 text-sm">{alert.title}</p>
                  <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", cfg.color,
                    alert.severity === "critical" ? "bg-red-100" : alert.severity === "warning" ? "bg-amber-100" : "bg-blue-100")}>
                    {cfg.label}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{alert.location} · {alert.time}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={cn("text-sm font-bold", cfg.color)}>{alert.value}</span>
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
    </div>
  );
}
