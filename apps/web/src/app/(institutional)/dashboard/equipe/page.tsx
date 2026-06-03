"use client";

import { useState } from "react";
import { UserPlus, Search, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

const TEAM = [
  { name: "Nathalie Kaboré",  role: "Coordonnatrice programmes", email: "nathalie.k@aceedo.bf",  initials: "NK", color: "#16A34A", status: "actif",  lastActive: "maintenant" },
  { name: "Adama Sanou",      role: "Analyste données",          email: "a.sanou@aceedo.bf",     initials: "AS", color: "#475569", status: "actif",  lastActive: "il y a 1h" },
  { name: "Fatoumata Ouédraogo", role: "Chargée de suivi",       email: "f.ouedraogo@aceedo.bf", initials: "FO", color: "#8B5CF6", status: "actif",  lastActive: "il y a 3h" },
  { name: "Ibrahim Traoré",   role: "Cartographe SIG",           email: "i.traore@aceedo.bf",    initials: "IT", color: "#0EA5E9", status: "actif",  lastActive: "hier" },
  { name: "Aminata Compaoré", role: "Responsable terrain",       email: "a.compaore@aceedo.bf",  initials: "AC", color: "#F97316", status: "en_attente", lastActive: "jamais" },
];

const ROLE_BADGES: Record<string, string> = {
  "Coordonnatrice programmes": "bg-purple-50 text-purple-700",
  "Analyste données":          "bg-blue-50 text-blue-700",
  "Chargée de suivi":          "bg-green-50 text-green-700",
  "Cartographe SIG":           "bg-cyan-50 text-cyan-700",
  "Responsable terrain":       "bg-amber-50 text-amber-700",
};

export default function EquipePage() {
  const [search, setSearch] = useState("");
  const filtered = TEAM.filter((m) =>
    !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Équipe</h1>
          <p className="text-sm text-gray-500 mt-1">
            <strong className="text-gray-800">{TEAM.length}</strong> membres · organisation ACEEDO
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-[#E04E2F] hover:bg-[#c73e22] text-white rounded-xl text-sm font-semibold transition-colors">
          <UserPlus className="w-4 h-4" /> Inviter un membre
        </button>
      </div>

      {/* Recherche */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Chercher un membre…"
          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E04E2F]/20 bg-white" />
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((member) => (
          <div key={member.email} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0"
                  style={{ background: member.color }}>
                  {member.initials}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{member.name}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full",
                      ROLE_BADGES[member.role] ?? "bg-gray-100 text-gray-600")}>
                      {member.role}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={cn("w-2 h-2 rounded-full",
                  member.status === "actif" ? "bg-[#16A34A]" : "bg-[#D97706]")} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <a href={`mailto:${member.email}`}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#E04E2F] transition-colors truncate">
                <Mail className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{member.email}</span>
              </a>
              <span className="text-[10px] text-gray-400 shrink-0 ml-2">{member.lastActive}</span>
            </div>
          </div>
        ))}

        {/* Card invitation */}
        <button className="bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 p-5 flex flex-col items-center justify-center gap-3 hover:border-[#E04E2F]/30 hover:bg-red-50/20 transition-colors min-h-[140px]">
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
            <UserPlus className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-500">Inviter un membre</p>
        </button>
      </div>
    </div>
  );
}
