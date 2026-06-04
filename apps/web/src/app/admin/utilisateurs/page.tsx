"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search, Download, UserPlus, MoreHorizontal, X, ChevronDown,
  Loader2, ChevronLeft, ChevronRight, Shield, Users,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

// ── Types ─────────────────────────────────────────────────────────────────────

type UserRole = "admin" | "institutional" | "public";

interface UserOut {
  id: string;
  email: string;
  full_name: string | null;
  organization: string | null;
  role: UserRole;
  is_active: boolean;
  is_verified: boolean;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface UserOutList {
  items: UserOut[];
  total: number;
  page: number;
  page_size: number;
}

// ── Config visuelle ───────────────────────────────────────────────────────────

const ROLE_LABELS: Record<UserRole, string> = {
  admin:         "Administrateur",
  institutional: "Contributeur",
  public:        "Lecteur",
};

const ROLE_BADGES: Record<UserRole, string> = {
  admin:         "bg-red-50 text-red-600 border-red-100",
  institutional: "bg-blue-50 text-blue-700 border-blue-100",
  public:        "bg-gray-100 text-gray-600 border-gray-200",
};

const ROLE_COLORS: Record<UserRole, string> = {
  admin:         "#DC2626",
  institutional: "#2563EB",
  public:        "#64748B",
};

function initials(user: UserOut): string {
  const name = user.full_name || user.email;
  return name.split(/[\s@.]+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

function colorFromId(id: string): string {
  const palette = ["#16A34A", "#0EA5E9", "#8B5CF6", "#D97706", "#E04E2F", "#14B8A6", "#F97316", "#22C55E"];
  let hash = 0;
  for (const c of id) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  return palette[Math.abs(hash) % palette.length];
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60)   return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`;
  if (diff < 86400 * 30) return `il y a ${Math.floor(diff / 86400)}j`;
  return d.toLocaleDateString("fr-FR");
}

// ── Page ─────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

export default function UtilisateursPage() {
  const queryClient = useQueryClient();
  const [search, setSearch]     = useState("");
  const [page, setPage]         = useState(1);
  const [editUser, setEditUser] = useState<UserOut | null>(null);
  const [editRole, setEditRole] = useState<UserRole>("public");
  const [editActive, setEditActive] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [debouncedQ, setDebouncedQ] = useState("");

  // Debounce recherche 300ms
  const handleSearch = (val: string) => {
    setSearch(val);
    setPage(1);
    clearTimeout((window as unknown as { _st?: ReturnType<typeof setTimeout> })._st);
    (window as unknown as { _st?: ReturnType<typeof setTimeout> })._st = setTimeout(() => setDebouncedQ(val), 300);
  };

  // ── Requêtes ──────────────────────────────────────────────────────────────

  const { data, isLoading, isFetching } = useQuery<UserOutList>({
    queryKey: ["admin-users", page, debouncedQ],
    queryFn: async () => {
      const params = new URLSearchParams({
        page:      String(page),
        page_size: String(PAGE_SIZE),
        ...(debouncedQ ? { q: debouncedQ } : {}),
      });
      const { data } = await api.get(`/users?${params}`);
      return data;
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, role, is_active }: { id: string; role: UserRole; is_active: boolean }) => {
      const { data } = await api.patch(`/users/${id}`, { role, is_active });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Utilisateur mis à jour");
      setEditUser(null);
    },
    onError: () => toast.error("Impossible de modifier l'utilisateur"),
  });

  // ── Stats agrégées ────────────────────────────────────────────────────────

  const users   = data?.items ?? [];
  const total   = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const roleStats: Record<UserRole, number> = { admin: 0, institutional: 0, public: 0 };
  users.forEach((u) => { roleStats[u.role]++; });
  const activeCount = users.filter((u) => u.is_active).length;

  // ── Rendu ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 sm:p-6 lg:p-8">

      {/* En-tête */}
      <div className="flex items-start justify-between gap-3 mb-5 sm:mb-6 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Utilisateurs & rôles</h1>
          {!isLoading && (
            <p className="text-sm text-gray-500 mt-1">
              <strong className="text-gray-800">{total.toLocaleString("fr-FR")}</strong> utilisateurs ·{" "}
              <strong className="text-[#16A34A]">{activeCount}</strong> actifs sur cette page
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              const csv = ["Email,Nom,Organisation,Rôle,Actif,Inscrit"].concat(
                users.map((u) => [u.email, u.full_name ?? "", u.organization ?? "", u.role, u.is_active ? "Oui" : "Non", u.created_at.slice(0, 10)].join(","))
              ).join("\n");
              const a = document.createElement("a");
              a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
              a.download = "utilisateurs_fasodata.csv"; a.click();
              toast.success("Export CSV téléchargé");
            }}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 bg-white">
            <Download className="w-3.5 h-3.5" /> Exporter
          </button>
          <button onClick={() => setShowInvite(true)}
            className="flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 bg-[#E04E2F] hover:bg-[#c73e22] text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors">
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Inviter</span>
          </button>
        </div>
      </div>

      {/* Stats rôles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Total",         value: total,                       color: "#1A2C42" },
          { label: "Administrateurs", value: roleStats.admin,           color: "#DC2626" },
          { label: "Contributeurs", value: roleStats.institutional,     color: "#2563EB" },
          { label: "Lecteurs",      value: roleStats.public,            color: "#64748B" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full" style={{ background: color }} />
              <span className="text-xs text-gray-500">{label}</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {isLoading ? <span className="block w-12 h-7 bg-gray-100 rounded animate-pulse" /> : value.toLocaleString("fr-FR")}
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

        {/* Toolbar */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-gray-100 flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Nom, email, organisation…"
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#E04E2F]/20"
            />
          </div>
          {isFetching && !isLoading && <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />}
          <span className="text-xs text-gray-400 ml-auto">{total} résultats</span>
        </div>

        {/* En-tête colonnes — masqué sur mobile */}
        <div className="hidden md:grid grid-cols-[2fr_1.5fr_1.5fr_1.5fr_1fr_auto] gap-4 px-5 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-50 bg-gray-50/50">
          <span>Utilisateur</span>
          <span>Organisation</span>
          <span>Rôle</span>
          <span>Inscrit</span>
          <span>Statut</span>
          <span>Actions</span>
        </div>

        {/* Lignes */}
        <div className="divide-y divide-gray-50">
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                <div className="w-9 h-9 rounded-full bg-gray-100 animate-pulse shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 bg-gray-100 rounded animate-pulse w-48" />
                  <div className="h-3 bg-gray-100 rounded animate-pulse w-32" />
                </div>
              </div>
            ))
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center px-4">
              <Users className="w-10 h-10 text-gray-200 mb-3" />
              <p className="font-medium text-gray-600">
                {debouncedQ ? "Aucun résultat pour cette recherche" : "Aucun utilisateur"}
              </p>
            </div>
          ) : users.map((user) => {
            const ini  = initials(user);
            const col  = colorFromId(user.id);
            const roleBadge = ROLE_BADGES[user.role];
            const roleLabel = ROLE_LABELS[user.role];

            return (
              <div key={user.id}
                className="flex md:grid md:grid-cols-[2fr_1.5fr_1.5fr_1.5fr_1fr_auto] items-center gap-3 md:gap-4 px-4 sm:px-5 py-3 sm:py-3.5 hover:bg-gray-50/60 transition-colors">

                {/* Utilisateur */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ background: col }}>
                    {ini}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {user.full_name ?? <span className="text-gray-400 font-normal italic">Sans nom</span>}
                    </p>
                    <p className="text-[11px] text-gray-400 truncate">{user.email}</p>
                  </div>
                </div>

                {/* Organisation */}
                <span className="text-sm text-gray-600 truncate hidden md:block">
                  {user.organization ?? <span className="text-gray-300">—</span>}
                </span>

                {/* Rôle */}
                <span className={cn("inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-lg border w-fit", roleBadge)}>
                  {roleLabel}
                </span>

                {/* Inscrit */}
                <span className="text-sm text-gray-500 hidden md:block">{formatDate(user.created_at)}</span>

                {/* Statut */}
                <div className="hidden md:flex items-center gap-1.5">
                  <span className={cn("w-2 h-2 rounded-full", user.is_active ? "bg-[#16A34A]" : "bg-gray-300")} />
                  <span className={cn("text-xs font-medium", user.is_active ? "text-[#16A34A]" : "text-gray-400")}>
                    {user.is_active ? "Actif" : "Inactif"}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => { setEditUser(user); setEditRole(user.role); setEditActive(user.is_active); }}
                    className="text-xs font-medium text-gray-600 hover:text-[#E04E2F] px-2 py-1 rounded hover:bg-red-50 transition-colors">
                    Modifier
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100 bg-gray-50/30">
            <span className="text-xs text-gray-400">
              Page {page} / {totalPages} · {total} utilisateurs
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg disabled:opacity-30 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg disabled:opacity-30 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal édition utilisateur */}
      {editUser && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEditUser(null)} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Modifier l'utilisateur</h2>
              <button onClick={() => setEditUser(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {/* Infos utilisateur */}
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                  style={{ background: colorFromId(editUser.id) }}>
                  {initials(editUser)}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{editUser.full_name ?? editUser.email}</p>
                  <p className="text-xs text-gray-400">{editUser.email}</p>
                </div>
              </div>

              {/* Rôle */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Rôle</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["public", "institutional", "admin"] as UserRole[]).map((r) => (
                    <button key={r} type="button"
                      onClick={() => setEditRole(r)}
                      className={cn("py-2.5 rounded-xl text-xs font-semibold border transition-colors",
                        editRole === r
                          ? r === "admin" ? "bg-red-50 border-red-200 text-red-600"
                          : r === "institutional" ? "bg-blue-50 border-blue-200 text-blue-700"
                          : "bg-gray-100 border-gray-200 text-gray-700"
                          : "border-gray-200 text-gray-500 hover:border-gray-300")}>
                      {ROLE_LABELS[r]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Statut */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Statut du compte</label>
                <div className="flex gap-2">
                  {[true, false].map((active) => (
                    <button key={String(active)} type="button"
                      onClick={() => setEditActive(active)}
                      className={cn("flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-colors",
                        editActive === active
                          ? active ? "bg-green-50 border-green-200 text-green-700" : "bg-gray-100 border-gray-200 text-gray-600"
                          : "border-gray-200 text-gray-400 hover:border-gray-300")}>
                      {active ? "Actif" : "Désactivé"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button onClick={() => setEditUser(null)}
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
                  Annuler
                </button>
                <button
                  onClick={() => updateUserMutation.mutate({ id: editUser.id, role: editRole, is_active: editActive })}
                  disabled={updateUserMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#1A2C42] hover:bg-[#0f1e30] disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-colors">
                  {updateUserMutation.isPending
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Enregistrement…</>
                    : <><Shield className="w-4 h-4" /> Enregistrer</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal invitation */}
      {showInvite && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowInvite(false)} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md px-6 py-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900">Inviter un utilisateur</h2>
              <button onClick={() => setShowInvite(false)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-gray-500 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
              💡 Pour inviter un utilisateur, demandez-lui de créer un compte sur{" "}
              <a href="/auth/inscription" className="font-semibold text-[#1A2C42] underline">
                /auth/inscription
              </a>.
              Vous pourrez ensuite modifier son rôle ici.
            </p>
            <button onClick={() => setShowInvite(false)}
              className="mt-4 w-full py-2.5 bg-[#1A2C42] text-white rounded-xl text-sm font-semibold">
              Compris
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
