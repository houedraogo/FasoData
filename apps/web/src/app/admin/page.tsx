"use client";

import { useQuery } from "@tanstack/react-query";
import { Users, Database, Download, Activity, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";
import { formatNumber } from "@/lib/utils";

export default function AdminDashboardPage() {
  const { data: datasets } = useQuery({
    queryKey: ["admin-datasets-stats"],
    queryFn: async () => {
      const { data } = await api.get("/datasets?page_size=1&status=published");
      return data;
    },
  });

  const { data: users } = useQuery({
    queryKey: ["admin-users-stats"],
    queryFn: async () => {
      const { data } = await api.get("/users?page_size=1");
      return data;
    },
  });

  const kpis = [
    { label: "Utilisateurs total", value: formatNumber(users?.total || 0), icon: Users, delta: "+12 ce mois", color: "bg-blue-50 text-blue-600" },
    { label: "Datasets publiés", value: formatNumber(datasets?.total || 0), icon: Database, delta: "+8 ce mois", color: "bg-green-50 text-green-600" },
    { label: "Téléchargements", value: "15 234", icon: Download, delta: "+23% vs mois dernier", color: "bg-purple-50 text-purple-600" },
    { label: "Jobs en attente", value: "3", icon: Activity, delta: "0 erreur", color: "bg-orange-50 text-orange-600" },
  ];

  const recentActivity = [
    { type: "dataset", message: "Nouveau dataset : Prix des céréales 2024", time: "Il y a 5 min", status: "success" },
    { type: "user", message: "Inscription : ong@save-children.bf", time: "Il y a 22 min", status: "info" },
    { type: "import", message: "Import CSV terminé (1 204 lignes)", time: "Il y a 1h", status: "success" },
    { type: "alert", message: "Tentative de connexion échouée (3x)", time: "Il y a 2h", status: "warning" },
    { type: "dataset", message: "Dataset archivé : Données sanitaires 2020", time: "Il y a 3h", status: "info" },
  ];

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Administration FasoData</h1>
        <p className="text-gray-500 text-sm mt-1">Vue d'ensemble du système</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map(({ label, value, icon: Icon, delta, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{label}</div>
            <div className="text-xs text-green-600 mt-2">{delta}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activité récente */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-bold text-gray-900 mb-5">Activité récente</h2>
          <div className="space-y-4">
            {recentActivity.map((item, i) => (
              <div key={i} className="flex items-start gap-3">
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
                <div className="flex-1">
                  <p className="text-sm text-gray-700">{item.message}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Liens rapides admin */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-bold text-gray-900 mb-5">Actions d'administration</h2>
          <div className="space-y-2">
            {[
              { href: "/admin/utilisateurs", label: "Gérer les utilisateurs", color: "text-blue-600 bg-blue-50" },
              { href: "/admin/datasets", label: "Modérer les datasets", color: "text-green-600 bg-green-50" },
              { href: "/admin/logs", label: "Consulter les logs", color: "text-purple-600 bg-purple-50" },
              { href: "/admin/securite", label: "Sécurité & accès", color: "text-red-600 bg-red-50" },
              { href: "/admin/parametres", label: "Paramètres système", color: "text-gray-600 bg-gray-50" },
            ].map(({ href, label, color }) => (
              <a
                key={href}
                href={href}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group"
              >
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
