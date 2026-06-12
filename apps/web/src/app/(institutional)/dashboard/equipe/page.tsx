"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  UserPlus, Search, Mail, X, ChevronDown,
  Loader2, Trash2, Clock, CheckCircle2, Ban,
  Users, RefreshCw,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { FocusTrap } from "@/components/ui/FocusTrap";
import toast from "react-hot-toast";

// ── Types ─────────────────────────────────────────────────────────────────────

type MemberStatus = "active" | "invited" | "suspended";

interface TeamMember {
  id: string;
  organization: string;
  email: string;
  full_name: string | null;
  role: string;
  access_level: string;
  status: MemberStatus;
  user_id: string | null;
  invited_by_id: string | null;
  invited_at: string;
  joined_at: string | null;
  is_owner: boolean;
}

// ── Config visuelle ───────────────────────────────────────────────────────────

const STATUS_CFG: Record<MemberStatus, { icon: typeof CheckCircle2; color: string; bg: string; label: string }> = {
  active:    { icon: CheckCircle2, color: "text-[#16A34A]", bg: "bg-green-50",  label: "Actif" },
  invited:   { icon: Clock,        color: "text-[#D97706]", bg: "bg-amber-50",  label: "En attente" },
  suspended: { icon: Ban,          color: "text-gray-400",  bg: "bg-gray-50",   label: "Suspendu" },
};

const ROLES = [
  "Coordonnateur programmes",
  "Analyste données",
  "Chargé de suivi",
  "Cartographe SIG",
  "Responsable terrain",
  "Data Manager",
  "Contributeur",
  "Lecteur",
];

const ACCESS_LEVELS = ["admin", "editor", "viewer"];
const ACCESS_LABELS: Record<string, string> = {
  admin:  "Administrateur",
  editor: "Éditeur",
  viewer: "Lecteur",
};

function colorFromStr(str: string): string {
  const palette = ["#16A34A","#0EA5E9","#8B5CF6","#D97706","#E04E2F","#14B8A6","#F97316","#475569"];
  let h = 0;
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return palette[Math.abs(h) % palette.length];
}

function initials(member: TeamMember): string {
  const name = member.full_name || member.email;
  return name.split(/[\s@.]+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60)    return "à l'instant";
  if (diff < 3600)  return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`;
  if (diff < 86400 * 30) return `il y a ${Math.floor(diff / 86400)}j`;
  return d.toLocaleDateString("fr-FR");
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function EquipePage() {
  const queryClient = useQueryClient();
  const { user }    = useAuth();

  const [search, setSearch]       = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [form, setForm] = useState({
    email: "", full_name: "", role: "Contributeur",
    access_level: "viewer", organization: "",
  });

  // ── Requêtes API ──────────────────────────────────────────────────────────

  const { data: members = [], isLoading, refetch } = useQuery<TeamMember[]>({
    queryKey: ["team-members"],
    queryFn: async () => {
      const { data } = await api.get("/dashboard/team-members");
      return data;
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      const { data } = await api.post("/dashboard/team-members", {
        ...payload,
        organization: payload.organization || user?.organization || "FasoData",
        status: "invited",
        is_owner: false,
      });
      return data as TeamMember;
    },
    onSuccess: (member) => {
      queryClient.setQueryData<TeamMember[]>(["team-members"], (prev = []) => [member, ...prev]);
      toast.success(`Invitation envoyée à ${member.email} !`);
      setShowInvite(false);
      setForm({ email: "", full_name: "", role: "Contributeur", access_level: "viewer", organization: "" });
    },
    onError: () => toast.error("Impossible d'envoyer l'invitation"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/dashboard/team-members/${id}`);
    },
    onSuccess: (_, id) => {
      queryClient.setQueryData<TeamMember[]>(["team-members"], (prev = []) => prev.filter((m) => m.id !== id));
      toast.success("Membre retiré");
    },
    onError: () => toast.error("Impossible de retirer le membre"),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: MemberStatus }) => {
      const { data } = await api.patch(`/dashboard/team-members/${id}`, { status });
      return data as TeamMember;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<TeamMember[]>(["team-members"], (prev = []) =>
        prev.map((m) => m.id === updated.id ? updated : m)
      );
      toast.success("Statut mis à jour");
    },
    onError: () => toast.error("Impossible de modifier le statut"),
  });

  // ── Données filtrées ──────────────────────────────────────────────────────

  const filtered = members.filter((m) =>
    !search ||
    (m.full_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase()) ||
    m.role.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total:   members.length,
    active:  members.filter((m) => m.status === "active").length,
    pending: members.filter((m) => m.status === "invited").length,
  };

  const handleInvite = () => {
    if (!form.email.includes("@")) { toast.error("Email invalide"); return; }
    if (!form.role)                 { toast.error("Rôle requis");   return; }
    inviteMutation.mutate(form);
  };

  // ── Rendu ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">

      {/* En-tête */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Équipe</h1>
          {!isLoading && (
            <p className="text-sm text-gray-500 mt-1">
              <strong className="text-gray-800">{stats.total}</strong> membres ·{" "}
              <strong className="text-[#16A34A]">{stats.active}</strong> actifs ·{" "}
              <strong className="text-[#D97706]">{stats.pending}</strong> en attente
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Actualiser la liste des membres">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setShowInvite(true)}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-[#E04E2F] hover:bg-[#c73e22] text-white rounded-xl text-sm font-semibold transition-colors">
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Inviter un membre</span>
          </button>
        </div>
      </div>

      {/* Recherche */}
      <div className="relative max-w-sm">
        <label htmlFor="team-search" className="sr-only">Chercher un membre</label>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        <input id="team-search" type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Chercher un membre…"
          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E04E2F]/20 bg-white" />
      </div>

      {/* Grille membres */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-xl bg-gray-100 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-32" />
                  <div className="h-3 bg-gray-100 rounded w-20" />
                </div>
              </div>
              <div className="h-3 bg-gray-100 rounded w-full" />
            </div>
          ))
        ) : filtered.length === 0 && !search ? (
          /* État vide */
          <div className="sm:col-span-2 lg:col-span-3 flex flex-col items-center py-16 bg-white rounded-2xl border border-gray-100">
            <Users className="w-10 h-10 text-gray-200 mb-3" />
            <p className="font-medium text-gray-600">Aucun membre dans votre équipe</p>
            <p className="text-sm text-gray-400 mt-1">Invitez votre premier collaborateur.</p>
            <button onClick={() => setShowInvite(true)}
              className="mt-4 flex items-center gap-2 px-4 py-2.5 bg-[#E04E2F] text-white rounded-xl text-sm font-semibold">
              <UserPlus className="w-4 h-4" /> Inviter un membre
            </button>
          </div>
        ) : (
          <>
            {filtered.map((member) => {
              const cfg    = STATUS_CFG[member.status];
              const Icon   = cfg.icon;
              const color  = colorFromStr(member.email);
              const ini    = initials(member);

              return (
                <div key={member.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4 group">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0"
                        style={{ background: color }}>
                        {ini}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">
                          {member.full_name ?? <span className="text-gray-400 font-normal italic">Sans nom</span>}
                        </p>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 inline-block mt-0.5">
                          {member.role}
                        </span>
                      </div>
                    </div>

                    {/* Actions (visibles au hover) */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {member.status === "invited" && (
                        <button
                          onClick={() => updateStatusMutation.mutate({ id: member.id, status: "active" })}
                          title="Marquer comme actif"
                          aria-label={`Marquer ${member.email} comme actif`}
                          className="p-1.5 text-gray-400 hover:text-[#16A34A] hover:bg-green-50 rounded-lg transition-colors">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => { if (confirm(`Retirer ${member.email} de l'équipe ?`)) deleteMutation.mutate(member.id); }}
                        aria-label={`Retirer ${member.email} de l'équipe`}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <a href={`mailto:${member.email}`}
                      className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#E04E2F] transition-colors min-w-0">
                      <Mail className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{member.email}</span>
                    </a>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <Icon className={cn("w-3 h-3", cfg.color)} />
                      <span className={cn("text-[10px] font-medium", cfg.color)}>{cfg.label}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                    <span className="text-[10px] text-gray-400">
                      {ACCESS_LABELS[member.access_level] ?? member.access_level}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      Invité {formatDate(member.invited_at)}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Card invitation */}
            <button onClick={() => setShowInvite(true)}
              className="bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 p-5 flex flex-col items-center justify-center gap-3 hover:border-[#E04E2F]/30 hover:bg-red-50/20 transition-colors min-h-[140px]">
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-500">Inviter un membre</p>
            </button>
          </>
        )}
      </div>

      {/* Modal invitation */}
      {showInvite && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center">
          <button type="button" className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowInvite(false)} aria-label="Fermer la modale" />
          <FocusTrap onEscape={() => setShowInvite(false)} labelledBy="invite-member-modal-title" describedBy="invite-member-modal-description" className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 id="invite-member-modal-title" className="font-bold text-gray-900">Inviter un membre</h2>
                <p id="invite-member-modal-description" className="text-xs text-gray-400 mt-0.5">Un email d'invitation sera envoyé automatiquement</p>
              </div>
              <button type="button" onClick={() => setShowInvite(false)}
                className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg"
                aria-label="Fermer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">

              {/* Email */}
              <div>
                <label htmlFor="invite-email" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Email <span className="text-[#E04E2F]">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                  <input id="invite-email" type="email" value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder="collaborateur@organisation.bf"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A2C42]/20" />
                </div>
              </div>

              {/* Nom */}
              <div>
                <label htmlFor="invite-full-name" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Nom complet <span className="text-gray-300">(optionnel)</span>
                </label>
                <input id="invite-full-name" type="text" value={form.full_name}
                  onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
                  placeholder="Prénom Nom"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A2C42]/20" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Rôle */}
                <div>
                  <label htmlFor="invite-role" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Rôle <span className="text-[#E04E2F]">*</span>
                  </label>
                  <div className="relative">
                    <select id="invite-role" value={form.role}
                      onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                      className="w-full appearance-none px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A2C42]/20">
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Niveau d'accès */}
                <div>
                  <span id="invite-access-label" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Accès
                  </span>
                  <div className="flex gap-1" role="group" aria-labelledby="invite-access-label">
                    {ACCESS_LEVELS.map((lvl) => (
                      <button key={lvl} type="button"
                        onClick={() => setForm((p) => ({ ...p, access_level: lvl }))}
                        aria-pressed={form.access_level === lvl}
                        className={cn("flex-1 py-2 rounded-xl text-[11px] font-semibold border transition-colors",
                          form.access_level === lvl
                            ? "bg-[#1A2C42] text-white border-[#1A2C42]"
                            : "border-gray-200 text-gray-500 hover:border-gray-300")}>
                        {ACCESS_LABELS[lvl]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Organisation */}
              <div>
                <label htmlFor="invite-organization" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Organisation
                </label>
                <input id="invite-organization" type="text" value={form.organization}
                  onChange={(e) => setForm((p) => ({ ...p, organization: e.target.value }))}
                  placeholder={user?.organization ?? "FasoData"}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A2C42]/20" />
              </div>

              {/* Note info */}
              <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                <Mail className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-700 leading-relaxed">
                  L'invité recevra un email lui expliquant comment créer son compte sur FasoData
                  et rejoindre <strong>{form.organization || user?.organization || "votre organisation"}</strong>.
                </p>
              </div>

              <div className="flex gap-3 justify-end pt-1">
                <button type="button" onClick={() => setShowInvite(false)}
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
                  Annuler
                </button>
                <button type="button" onClick={handleInvite}
                  disabled={inviteMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#E04E2F] hover:bg-[#c73e22] disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-colors">
                  {inviteMutation.isPending
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi…</>
                    : <><UserPlus className="w-4 h-4" /> Envoyer l'invitation</>}
                </button>
              </div>
            </div>
          </FocusTrap>
        </div>
      )}
    </div>
  );
}
