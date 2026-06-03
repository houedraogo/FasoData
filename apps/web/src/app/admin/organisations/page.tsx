"use client";

import { useState } from "react";
import { Search, Plus, Building2, Globe, Users, Database, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

const ORGS = [
  { id: "1",  name: "ACEEDO",            type: "ONG",              users: 12, datasets: 8,  status: "actif",      contact: "nathalie.k@aceedo.bf" },
  { id: "2",  name: "INSD",              type: "Institution pub.", users: 34, datasets: 47, status: "actif",      contact: "contact@insd.bf" },
  { id: "3",  name: "Min. Santé",        type: "Gouvernement",     users: 18, datasets: 23, status: "actif",      contact: "f.konate@minsante.gov.bf" },
  { id: "4",  name: "FAO Burkina",       type: "ONU",              users: 6,  datasets: 12, status: "actif",      contact: "fao-bf@fao.org" },
  { id: "5",  name: "OCHA",              type: "ONU",              users: 4,  datasets: 6,  status: "actif",      contact: "m.diallo@ocha.org" },
  { id: "6",  name: "Univ. Ouaga 1",     type: "Académique",       users: 89, datasets: 15, status: "actif",      contact: "a.yameogo@uniouaga.bf" },
  { id: "7",  name: "Ville Ouaga",       type: "Collectivité",     users: 22, datasets: 9,  status: "en_attente", contact: "issa.bamba@ouaga.bf" },
  { id: "8",  name: "Min. Agriculture",  type: "Gouvernement",     users: 15, datasets: 18, status: "actif",      contact: "paul.some@minagri.bf" },
  { id: "9",  name: "ANAM",              type: "Institution pub.", users: 8,  datasets: 31, status: "actif",      contact: "anam@meteo.bf" },
  { id: "10", name: "MENA",              type: "Gouvernement",     users: 29, datasets: 11, status: "actif",      contact: "mena@education.gov.bf" },
];

const TYPE_COLORS: Record<string, string> = {
  "ONG":             "bg-green-50 text-green-700 border-green-100",
  "Institution pub.":"bg-blue-50 text-blue-700 border-blue-100",
  "Gouvernement":    "bg-purple-50 text-purple-700 border-purple-100",
  "ONU":             "bg-cyan-50 text-cyan-700 border-cyan-100",
  "Académique":      "bg-amber-50 text-amber-700 border-amber-100",
  "Collectivité":    "bg-gray-100 text-gray-600 border-gray-200",
};

export default function OrganisationsPage() {
  const [search, setSearch] = useState("");
  const filtered = ORGS.filter((o) =>
    !search || o.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organisations</h1>
          <p className="text-sm text-gray-500 mt-1">
            <strong className="text-gray-800">38</strong> organisations ·{" "}
            <strong className="text-[#16A34A]">237</strong> utilisateurs actifs
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-[#E04E2F] hover:bg-[#c73e22] text-white rounded-xl text-sm font-semibold transition-colors">
          <Plus className="w-4 h-4" /> Ajouter une organisation
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "ONG & Associations",  value: 14, icon: Building2, color: "bg-green-50 text-green-600" },
          { label: "Institutions pub.",    value: 8,  icon: Globe,    color: "bg-blue-50 text-blue-600" },
          { label: "Gouvernement",         value: 7,  icon: Building2,color: "bg-purple-50 text-purple-600" },
          { label: "Académique / ONU",     value: 9,  icon: Users,    color: "bg-amber-50 text-amber-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", color)}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">{value}</div>
              <div className="text-xs text-gray-500">{label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Chercher une organisation…"
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#E04E2F]/20" />
          </div>
          <span className="text-xs text-gray-400 ml-auto">{filtered.length} résultat(s)</span>
        </div>
        <div className="divide-y divide-gray-50">
          {filtered.map((org) => (
            <div key={org.id}
              className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/60 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-faso-navy/10 flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4 text-faso-navy" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{org.name}</p>
                <p className="text-xs text-gray-400">{org.contact}</p>
              </div>
              <span className={cn("text-[11px] font-semibold px-2.5 py-1 rounded-lg border hidden sm:inline-flex",
                TYPE_COLORS[org.type] ?? "bg-gray-100 text-gray-500")}>
                {org.type}
              </span>
              <div className="flex items-center gap-1 text-sm text-gray-500 hidden md:flex">
                <Users className="w-3.5 h-3.5 text-gray-400" /> {org.users}
              </div>
              <div className="flex items-center gap-1 text-sm text-gray-500 hidden md:flex">
                <Database className="w-3.5 h-3.5 text-gray-400" /> {org.datasets}
              </div>
              <div className="flex items-center gap-1.5">
                <span className={cn("w-2 h-2 rounded-full",
                  org.status === "actif" ? "bg-[#16A34A]" : "bg-[#D97706]")} />
                <span className={cn("text-xs font-medium hidden sm:block",
                  org.status === "actif" ? "text-[#16A34A]" : "text-[#D97706]")}>
                  {org.status === "actif" ? "Active" : "En attente"}
                </span>
              </div>
              <button className="p-1.5 text-gray-400 hover:text-faso-navy hover:bg-gray-100 rounded-lg transition-colors">
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
