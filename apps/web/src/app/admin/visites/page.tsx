"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, BarChart3, Globe2, Lock, MousePointerClick, Users } from "lucide-react";
import { api } from "@/lib/api";
import { formatNumber } from "@/lib/utils";

type AnalyticsStats = {
  period_days: number;
  kpis: {
    total_views: number;
    unique_visitors: number;
    today_views: number;
    public_views: number;
    private_views: number;
    admin_views: number;
  };
  daily: Array<{ date: string; views: number; visitors: number }>;
  top_pages: Array<{ path: string; views: number; visitors: number }>;
  referrers: Array<{ source: string; views: number }>;
};

const PERIODS = [7, 30, 90] as const;

export default function AdminVisitesPage() {
  const [days, setDays] = useState<(typeof PERIODS)[number]>(30);
  const { data, isLoading, isError, refetch } = useQuery<AnalyticsStats>({
    queryKey: ["admin-analytics", days],
    queryFn: async () => {
      const { data } = await api.get(`/analytics/stats?days=${days}`);
      return data;
    },
  });

  const kpis = [
    {
      label: "Visites",
      value: data?.kpis.total_views ?? 0,
      detail: `${data?.kpis.today_views ?? 0} aujourd'hui`,
      icon: MousePointerClick,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Visiteurs uniques",
      value: data?.kpis.unique_visitors ?? 0,
      detail: "navigateurs distincts",
      icon: Users,
      color: "bg-green-50 text-green-600",
    },
    {
      label: "Pages publiques",
      value: data?.kpis.public_views ?? 0,
      detail: "site, catalogue, carte",
      icon: Globe2,
      color: "bg-cyan-50 text-cyan-600",
    },
    {
      label: "Espaces prives",
      value: (data?.kpis.private_views ?? 0) + (data?.kpis.admin_views ?? 0),
      detail: `${data?.kpis.admin_views ?? 0} vues admin`,
      icon: Lock,
      color: "bg-orange-50 text-orange-600",
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Statistiques des visites</h1>
          <p className="text-sm text-gray-500 mt-1">
            Suivi interne des pages vues et visiteurs uniques FasoData.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {PERIODS.map((period) => (
            <button
              key={period}
              type="button"
              onClick={() => setDays(period)}
              className={`rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                days === period ? "bg-[#1A2C42] text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {period} j
            </button>
          ))}
        </div>
      </div>

      {isError ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-5">
          <p className="text-sm font-semibold text-red-700">Impossible de charger les statistiques.</p>
          <button type="button" onClick={() => refetch()} className="mt-3 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-red-700">
            Reessayer
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
            {kpis.map(({ label, value, detail, icon: Icon, color }) => (
              <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="text-2xl font-bold text-gray-900">{isLoading ? "..." : formatNumber(value)}</div>
                <div className="text-xs text-gray-500 mt-0.5">{label}</div>
                <div className="text-xs text-green-600 mt-2">{detail}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-5">
                <BarChart3 className="w-4 h-4 text-[#E04E2F]" />
                <h2 className="font-bold text-gray-900">Evolution quotidienne</h2>
              </div>
              <div className="h-72">
                {isLoading ? (
                  <div className="h-full rounded-xl bg-gray-100 animate-pulse" />
                ) : data?.daily.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.daily} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#E04E2F" stopOpacity={0.25} />
                          <stop offset="100%" stopColor="#E04E2F" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF2F7" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Area type="monotone" dataKey="views" name="Visites" stroke="#E04E2F" fill="url(#viewsGradient)" strokeWidth={2} />
                      <Area type="monotone" dataKey="visitors" name="Visiteurs" stroke="#16A34A" fill="transparent" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-gray-400">
                    Aucune visite enregistree sur cette periode.
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-5">
                <Activity className="w-4 h-4 text-[#E04E2F]" />
                <h2 className="font-bold text-gray-900">Sources</h2>
              </div>
              <div className="space-y-3">
                {(data?.referrers ?? []).map((item) => (
                  <div key={item.source} className="flex items-center justify-between gap-3 border-b border-gray-50 pb-3 last:border-0">
                    <span className="text-sm font-medium text-gray-700 truncate">{item.source === "direct" ? "Acces direct" : item.source}</span>
                    <span className="text-sm font-bold text-gray-900">{formatNumber(item.views)}</span>
                  </div>
                ))}
                {!isLoading && !data?.referrers.length && <p className="text-sm text-gray-400">Aucune source disponible.</p>}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-bold text-gray-900 mb-5">Pages les plus visitees</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                    <th className="pb-3 font-semibold">Page</th>
                    <th className="pb-3 font-semibold text-right">Visites</th>
                    <th className="pb-3 font-semibold text-right">Visiteurs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(data?.top_pages ?? []).map((item) => (
                    <tr key={item.path}>
                      <td className="py-3 font-medium text-gray-800">{item.path}</td>
                      <td className="py-3 text-right text-gray-700">{formatNumber(item.views)}</td>
                      <td className="py-3 text-right text-gray-700">{formatNumber(item.visitors)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!isLoading && !data?.top_pages.length && (
                <p className="py-8 text-center text-sm text-gray-400">Aucune page visitee pour le moment.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
