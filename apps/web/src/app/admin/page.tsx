"use client";

import { useQuery } from "@tanstack/react-query";
import { Users, Database, Download, Activity, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";
import { formatNumber } from "@/lib/utils";

interface DatasetList {
  total: number;
  items?: Array<{ download_count?: number }>;
}

interface UserList {
  total: number;
}

interface OrganizationResponse {
  kpis: { organizations: number; verified: number; datasets: number; regions: string; users: number };
}

interface ActivityItem {
  type: string;
  message: string;
  time: string;
  status: "success" | "warning" | "info";
}

export default function AdminDashboardPage() {
  const { data: datasets } = useQuery<DatasetList>({
    queryKey: ["admin-datasets-stats"],
    queryFn: async () => {
      const { data } = await api.get("/datasets?page_size=100&status=published");
      return data;
    },
  });

  const { data: users } = useQuery<UserList>({
    queryKey: ["admin-users-stats"],
    queryFn: async () => {
      const { data } = await api.get("/users?page_size=1");
      return data;
    },
  });

  const { data: organizations } = useQuery<OrganizationResponse>({
    queryKey: ["admin-organizations-stats"],
    queryFn: async () => {
      const { data } = await api.get("/dashboard/organizations");
      return data;
    },
  });

  const { data: recentActivity = [] } = useQuery<ActivityItem[]>({
    queryKey: ["admin-activity"],
    queryFn: async () => {
      const { data } = await api.get("/dashboard/admin/activity?limit=8");
      return data;
    },
  });

  const downloadTotal = (datasets?.items ?? []).reduce((sum, item) => sum + (item.download_count ?? 0), 0);

  const kpis = [
    { label: "Utilisateurs total", value: formatNumber(users?.total || 0), icon: Users, delta: `${organizations?.kpis.organizations ?? 0} organisations`, color: "bg-blue-50 text-blue-600" },
    { label: "Datasets publiés", value: formatNumber(datasets?.total || 0), icon: Database, delta: `${organizations?.kpis.verified ?? 0} organisations vérifiées`, color: "bg-green-50 text-green-600" },
    { label: "Téléchargements", value: formatNumber(downloadTotal), icon: Download, delta: "catalogue publié", color: "bg-purple-50 text-purple-600" },
    { label: "Activités récentes", value: formatNumber(recentActivity.length), icon: Activity, delta: "événements réels", color: "bg-orange-50 text-orange-600" },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Administration FasoData</h1>
        <p className="text-gray-500 text-sm mt-1">Vue d'ensemble du système</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {kpis.map(({ label, value, icon: Icon, delta, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-gray-900">{value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{label}</div>
            <div className="text-xs text-green-600 mt-2">{delta}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
          <h2 className="font-bold text-gray-900 mb-5">Activité récente</h2>
          <div className="space-y-4">
            {recentActivity.length === 0 && (
              <p className="text-sm text-gray-500">Aucune activité récente enregistrée.</p>
            )}
            {recentActivity.map((item, index) => (
              <div key={`${item.type}-${index}`} className="flex items-start gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  item.status === "success" ? "bg-green-100" :
                  item.status === "warning" ? "bg-yellow-100" : "bg-blue-100"
                }`}>
                  {item.status === "success" ? (
                    <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                  ) : item.status === "warning" ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-yellow-600" />
                  ) : (
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700">{item.message}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
          <h2 className="font-bold text-gray-900 mb-5">Actions d'administration</h2>
          <div className="space-y-2">
            {[
              { href: "/admin/utilisateurs", label: "Gérer les utilisateurs", color: "text-blue-600 bg-blue-50" },
              { href: "/admin/datasets", label: "Modérer les datasets", color: "text-green-600 bg-green-50" },
              { href: "/admin/organisations", label: "Organisations", color: "text-cyan-600 bg-cyan-50" },
              { href: "/admin/supervision", label: "Supervision technique", color: "text-purple-600 bg-purple-50" },
              { href: "/admin/parametres", label: "Paramètres système", color: "text-gray-600 bg-gray-50" },
            ].map(({ href, label, color }) => (
              <a key={href} href={href} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group">
                <div className={`w-2 h-2 rounded-full ${color.split(" ")[1]}`} />
                <span className="text-sm text-gray-700 group-hover:text-gray-900">{label}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
