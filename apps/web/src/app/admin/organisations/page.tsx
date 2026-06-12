"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Plus, Building2, Globe, Users, Database, ExternalLink } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface OrganizationItem {
  name: string;
  type: string;
  datasets: number;
  users: number;
  status: string;
}

interface OrganizationsResponse {
  kpis: {
    organizations: number;
    verified: number;
    datasets: number;
    regions: string;
    users: number;
  };
  items: OrganizationItem[];
}

const TYPE_COLORS: Record<string, string> = {
  "Organisation partenaire": "bg-blue-50 text-blue-700 border-blue-100",
};

export default function OrganisationsPage() {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery<OrganizationsResponse>({
    queryKey: ["admin-organizations"],
    queryFn: async () => {
      const { data } = await api.get("/dashboard/organizations");
      return data;
    },
  });

  const organizations = data?.items ?? [];
  const filtered = organizations.filter((org) =>
    !search || org.name.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = organizations.filter((org) => org.status === "Verifiee").length;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex items-start justify-between gap-4 mb-5 sm:mb-6 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Organisations</h1>
          <p className="text-sm text-gray-500 mt-1">
            <strong className="text-gray-800">{data?.kpis.organizations ?? 0}</strong> organisations ·{" "}
            <strong className="text-[#16A34A]">{data?.kpis.users ?? 0}</strong> utilisateurs
          </p>
        </div>
        <a
          href="/dashboard/equipe"
          className="flex w-full sm:w-auto items-center justify-center gap-2 px-4 py-2.5 bg-[#E04E2F] hover:bg-[#c73e22] text-white rounded-xl text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" /> Inviter un membre
        </a>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-5 sm:mb-6">
        {[
          { label: "Organisations", value: data?.kpis.organizations ?? 0, icon: Building2, color: "bg-green-50 text-green-600" },
          { label: "Vérifiées", value: data?.kpis.verified ?? 0, icon: Globe, color: "bg-blue-50 text-blue-600" },
          { label: "Datasets", value: data?.kpis.datasets ?? 0, icon: Database, color: "bg-purple-50 text-purple-600" },
          { label: "Actives", value: activeCount, icon: Users, color: "bg-amber-50 text-amber-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 min-w-0">
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", color)}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xl font-bold text-gray-900">{value}</div>
              <div className="text-xs text-gray-500">{label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 border-b border-gray-100 flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Chercher une organisation..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#E04E2F]/20"
            />
          </div>
          <span className="text-xs text-gray-400 sm:ml-auto">
            {isLoading ? "Chargement..." : `${filtered.length} résultat(s)`}
          </span>
        </div>

        <div className="divide-y divide-gray-50">
          {!isLoading && filtered.length === 0 && (
            <div className="px-5 py-10 text-sm text-gray-500 text-center">
              Aucune organisation trouvée.
            </div>
          )}

          {filtered.map((org) => (
            <div key={org.name} className="flex items-start sm:items-center gap-3 sm:gap-4 px-4 sm:px-5 py-4 hover:bg-gray-50/60 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-faso-navy/10 flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4 text-faso-navy" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{org.name}</p>
                <p className="text-xs text-gray-400">{org.users} utilisateur(s) · {org.datasets} dataset(s)</p>
              </div>
              <span className={cn("text-[11px] font-semibold px-2.5 py-1 rounded-lg border hidden sm:inline-flex", TYPE_COLORS[org.type] ?? "bg-gray-100 text-gray-500 border-gray-200")}>
                {org.type}
              </span>
              <div className="flex items-center gap-1 text-sm text-gray-500 hidden md:flex">
                <Users className="w-3.5 h-3.5 text-gray-400" /> {org.users}
              </div>
              <div className="flex items-center gap-1 text-sm text-gray-500 hidden md:flex">
                <Database className="w-3.5 h-3.5 text-gray-400" /> {org.datasets}
              </div>
              <div className="flex items-center gap-1.5">
                <span className={cn("w-2 h-2 rounded-full", org.status === "Verifiee" ? "bg-[#16A34A]" : "bg-[#D97706]")} />
                <span className={cn("text-xs font-medium hidden sm:block", org.status === "Verifiee" ? "text-[#16A34A]" : "text-[#D97706]")}>
                  {org.status}
                </span>
              </div>
              <a href={`/admin/utilisateurs?q=${encodeURIComponent(org.name)}`} className="p-1.5 text-gray-400 hover:text-faso-navy hover:bg-gray-100 rounded-lg transition-colors">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
