"use client";

import { useQuery } from "@tanstack/react-query";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { RefreshCw, Settings } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface SupervisionResponse {
  status: "operational" | "degraded" | "incident";
  last_check: string;
  kpis: Array<{ label: string; value: string; unit: string; sub: string }>;
  services: Array<{ name: string; desc: string; version: string; uptime: string; latency: string; status: "ok" | "warn" | "down" }>;
  resources: Array<{ label: string; value: number; detail: string }>;
}

function Spark({ color }: { color: string }) {
  const pts = [2, 3, 2.5, 4, 3.6, 4.2, 4].map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width="100%" height={36}>
      <AreaChart data={pts} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
        <defs>
          <linearGradient id={`sg${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.18} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#sg${color.replace("#", "")})`} dot={false} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function ResourceBar({ label, value, detail }: { label: string; value: number; detail: string }) {
  const color = value >= 80 ? "#E04E2F" : value >= 65 ? "#D97706" : "#16A34A";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-800">{label}</span>
        <span className="text-sm font-bold" style={{ color }}>{value}%</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }} />
      </div>
      <p className="text-xs text-gray-400">{detail}</p>
    </div>
  );
}

const STATUS_META = {
  operational: { label: "Systèmes opérationnels", color: "#16A34A", bg: "bg-green-50 border-green-100 text-[#16A34A]" },
  degraded: { label: "Performance dégradée", color: "#D97706", bg: "bg-amber-50 border-amber-100 text-[#D97706]" },
  incident: { label: "Incident en cours", color: "#E04E2F", bg: "bg-red-50 border-red-100 text-[#E04E2F]" },
};

export default function SupervisionPage() {
  const { data, isLoading, refetch, isFetching } = useQuery<SupervisionResponse>({
    queryKey: ["admin-supervision"],
    queryFn: async () => {
      const { data } = await api.get("/dashboard/supervision");
      return data;
    },
    staleTime: 30_000,
  });

  const status = STATUS_META[data?.status ?? "operational"];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-start sm:items-center gap-2 sm:gap-3 mb-3 flex-col sm:flex-row">
            <span className={cn("flex items-center gap-2 text-xs font-semibold border px-3 py-1.5 rounded-full", status.bg)}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: status.color }} />
              {status.label}
            </span>
            <span className="text-sm text-gray-400">Dernière vérification {data?.last_check ?? "-"}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Supervision technique</h1>
        </div>
        <div className="grid grid-cols-1 sm:flex sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <button onClick={() => refetch()} className="flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 bg-white transition-colors">
            <RefreshCw className={cn("w-4 h-4", isFetching && "animate-spin")} /> Actualiser
          </button>
          <a href="/admin/alertes-email" className="flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 bg-white transition-colors">
            <Settings className="w-4 h-4" /> Configurer alertes
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        {(data?.kpis ?? []).map((kpi, index) => {
          const color = index === 3 ? "#D97706" : index === 2 ? "#1A2C42" : "#16A34A";
          return (
            <div key={kpi.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">{kpi.label}</p>
              <div className="flex items-end justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl sm:text-3xl font-bold" style={{ color }}>{kpi.value}</span>
                    {kpi.unit && <span className="text-sm text-gray-400 font-medium ml-0.5">{kpi.unit}</span>}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{kpi.sub}</p>
                </div>
                <div className="hidden sm:block w-24 shrink-0">
                  <Spark color={color} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <span className="w-1 h-4 bg-[#E04E2F] rounded-full" />
            <h2 className="font-bold text-gray-900 text-sm">Services & infrastructure</h2>
            <span className="text-xs text-gray-400 ml-1">État en temps réel</span>
          </div>
          <div className="divide-y divide-gray-50">
            {!isLoading && (data?.services ?? []).length === 0 && (
              <div className="px-5 py-10 text-sm text-gray-500 text-center">Aucune métrique de service enregistrée.</div>
            )}
            {(data?.services ?? []).map((svc) => (
              <div key={`${svc.name}-${svc.version}`} className="grid grid-cols-[12px_1fr] sm:grid-cols-[12px_1fr_auto_auto_auto] items-start sm:items-center gap-3 sm:gap-4 px-4 sm:px-5 py-4 sm:py-3">
                <div className={cn("w-2 h-2 rounded-full", svc.status === "ok" ? "bg-[#16A34A]" : svc.status === "warn" ? "bg-[#D97706] animate-pulse" : "bg-[#E04E2F] animate-pulse")} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{svc.name}</p>
                  <p className="text-[10px] text-gray-400">{svc.desc}</p>
                </div>
                <div className="col-start-2 flex flex-wrap items-center gap-2 sm:contents">
                  <span className="text-[10px] font-mono bg-gray-100 text-gray-600 px-2 py-1 rounded-lg whitespace-nowrap">{svc.version}</span>
                  <span className="text-sm font-semibold text-gray-700 sm:w-20 sm:text-right">{svc.uptime}</span>
                  <span className="text-xs text-gray-400 sm:w-12 sm:text-right">{svc.latency}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-5">
            <span className="w-1 h-4 bg-[#E04E2F] rounded-full" />
            <h2 className="font-bold text-gray-900 text-sm">Ressources serveur</h2>
            <span className="text-xs text-gray-400">Charge actuelle</span>
          </div>
          <div className="space-y-5">
            {!isLoading && (data?.resources ?? []).length === 0 && (
              <p className="text-sm text-gray-500">Aucune ressource suivie.</p>
            )}
            {(data?.resources ?? []).map((resource) => <ResourceBar key={resource.label} {...resource} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
