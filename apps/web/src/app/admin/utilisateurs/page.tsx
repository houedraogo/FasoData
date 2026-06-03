"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Download, Upload, UserPlus, MoreHorizontal } from "lucide-react";
import { api } from "@/lib/api";
import { MOCK_USERS, ROLE_COUNTS } from "@/lib/mockData";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

// ── Config ──────────────────────────────────────────────────────────────────

const ROLE_BADGES: Record<string, string> = {
  "Administrateur": "bg-red-50 text-red-600 border-red-100",
  "Data Manager":   "bg-green-50 text-green-700 border-green-100",
  "Producteur":     "bg-blue-50 text-blue-700 border-blue-100",
  "Contributeur":   "bg-amber-50 text-amber-700 border-amber-100",
  "Lecteur":        "bg-gray-100 text-gray-600 border-gray-200",
  "Chercheur":      "bg-indigo-50 text-indigo-700 border-indigo-100",
  "Invité":         "bg-gray-50 text-gray-500 border-gray-100",
};

const STATUS_CFG: Record<string, { dot: string; label: string; text: string }> = {
  actif:      { dot: "bg-[#16A34A]", label: "Actif",      text: "text-[#16A34A]" },
  en_attente: { dot: "bg-[#D97706]", label: "En attente", text: "text-[#D97706]" },
  suspendu:   { dot: "bg-[#DC2626]", label: "Suspendu",   text: "text-[#DC2626]" },
  inactif:    { dot: "bg-gray-400",  label: "Inactif",    text: "text-gray-400" },
};

// ── Page ─────────────────────────────────────────────────────────────────────

export default function UtilisateursPage() {
  const [search, setSearch] = useState("");
  const queryClient         = useQueryClient();

  const filtered = MOCK_USERS.filter((u) =>
    !search ||
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.org.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8">

      {/* En-tête */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Utilisateurs & rôles</h1>
          <p className="text-sm text-gray-500 mt-1">
            <strong className="text-gray-800">2 184</strong> utilisateurs ·{" "}
            <strong className="text-gray-800">38</strong> organisations ·{" "}
            <strong className="text-[#16A34A]">1 421</strong> actifs ce mois
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors bg-white">
            <Download className="w-3.5 h-3.5" />
            Exporter
          </button>
          <button className="flex items-center gap-1.5 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors bg-white">
            <Upload className="w-3.5 h-3.5" />
            Import CSV
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-[#E04E2F] hover:bg-[#c73e22] text-white rounded-xl text-sm font-semibold transition-colors">
            <UserPlus className="w-4 h-4" />
            Inviter un utilisateur
          </button>
        </div>
      </div>

      {/* Compteurs rôles */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 divide-x divide-gray-100">
          {Object.entries(ROLE_COUNTS).map(([role, { count, desc, color }]) => (
            <div key={role} className="pl-4 first:pl-0">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                <span className="text-xs text-gray-500 font-medium">{role}</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{count.toLocaleString("fr-FR")}</div>
              <div className="text-[10px] text-gray-400 mt-0.5">{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

        {/* Toolbar */}
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Chercher un utilisateur, email, organisation…"
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#E04E2F]/20 focus:border-[#E04E2F]/30"
            />
          </div>
          <div className="flex items-center gap-2 ml-auto">
            {[{ label: "Tous les rôles" }, { label: "Toutes orgs" }, { label: "Statut" }].map(({ label }) => (
              <button key={label} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50">
                <span>=</span> {label}
              </button>
            ))}
          </div>
          <span className="text-xs text-gray-400">{filtered.length} sur 2 184</span>
        </div>

        {/* En-tête tableau */}
        <div className="grid grid-cols-[2fr_1.5fr_1.5fr_1.5fr_1fr_auto] gap-4 px-5 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-50 bg-gray-50/50">
          <span>Utilisateur</span>
          <span>Organisation</span>
          <span>Rôle</span>
          <span>Dernière activité</span>
          <span>Statut</span>
          <span>Actions</span>
        </div>

        {/* Lignes */}
        <div className="divide-y divide-gray-50">
          {filtered.map((user) => {
            const statusCfg = STATUS_CFG[user.status] ?? STATUS_CFG.inactif;
            const roleBadge = ROLE_BADGES[user.role] ?? "bg-gray-100 text-gray-500 border-gray-200";

            return (
              <div key={user.id}
                className="grid grid-cols-[2fr_1.5fr_1.5fr_1.5fr_1fr_auto] gap-4 items-center px-5 py-3.5 hover:bg-gray-50/60 transition-colors">

                {/* Utilisateur */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ background: user.color }}
                  >
                    {user.initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                    <p className="text-[11px] text-gray-400 truncate">{user.email}</p>
                  </div>
                </div>

                {/* Organisation */}
                <span className="text-sm text-gray-600 truncate">{user.org}</span>

                {/* Rôle */}
                <span className={cn("inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-lg border w-fit", roleBadge)}>
                  {user.role}
                </span>

                {/* Dernière activité */}
                <span className="text-sm text-gray-500">{user.lastActivity}</span>

                {/* Statut */}
                <div className="flex items-center gap-1.5">
                  <span className={cn("w-2 h-2 rounded-full", statusCfg.dot)} />
                  <span className={cn("text-xs font-medium", statusCfg.text)}>{statusCfg.label}</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button className="text-xs font-medium text-gray-600 hover:text-[#E04E2F] px-2 py-1 rounded hover:bg-red-50 transition-colors">
                    Modifier
                  </button>
                  <button className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
