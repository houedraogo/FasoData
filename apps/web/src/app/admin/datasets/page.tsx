"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search, Database, CheckCircle2, Archive, Trash2,
  ExternalLink, ChevronLeft, ChevronRight, FileText,
  Clock, Globe, XCircle, Filter, RefreshCw,
} from "lucide-react";
import { api } from "@/lib/api";
import { formatDate, formatNumber, formatBytes } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { FocusTrap } from "@/components/ui/FocusTrap";
import { DataOriginBadge } from "@/components/ui/DataOriginBadge";
import toast from "react-hot-toast";

// ── Types ────────────────────────────────────────────────────────────────────

type DatasetStatus = "draft" | "pending" | "published" | "archived";

interface Dataset {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string | null;
  status: DatasetStatus;
  data_origin?: string | null;
  license: string;
  is_geo: boolean;
  file_format: string | null;
  file_size_bytes: number | null;
  row_count: number | null;
  download_count: number;
  view_count: number;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

interface DatasetList {
  items: Dataset[];
  total: number;
  page: number;
  page_size: number;
}

// ── Config statuts ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<DatasetStatus, { label: string; color: string; icon: React.ElementType }> = {
  draft:     { label: "Brouillon",  color: "bg-gray-100 text-gray-600",   icon: FileText },
  pending:   { label: "En attente", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  published: { label: "Publié",     color: "bg-green-100 text-green-700",  icon: Globe },
  archived:  { label: "Archivé",    color: "bg-red-100 text-red-600",      icon: Archive },
};

const TABS: { key: DatasetStatus | "all"; label: string }[] = [
  { key: "all",       label: "Tous" },
  { key: "draft",     label: "Brouillons" },
  { key: "pending",   label: "En attente" },
  { key: "published", label: "Publiés" },
  { key: "archived",  label: "Archivés" },
];

// ── Composant badge statut ────────────────────────────────────────────────────

function StatusBadge({ status }: { status: DatasetStatus }) {
  const { label, color, icon: Icon } = STATUS_CONFIG[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium", color)}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

// ── Modal de confirmation ─────────────────────────────────────────────────────

function ConfirmModal({
  open, title, message, confirmLabel, confirmClass, onConfirm, onClose,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmClass: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button type="button" className="absolute inset-0 bg-black/40" onClick={onClose} aria-label="Fermer la modale" />
      <FocusTrap
        onEscape={onClose}
        labelledBy="confirm-modal-title"
        describedBy="confirm-modal-description"
        className="relative bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4"
      >
        <h3 id="confirm-modal-title" className="font-bold text-gray-900 text-lg mb-2">{title}</h3>
        <p id="confirm-modal-description" className="text-gray-500 text-sm mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="btn-secondary text-sm px-4 py-2">
            Annuler
          </button>
          <button onClick={() => { onConfirm(); onClose(); }} className={cn("px-4 py-2 rounded-xl text-sm font-medium text-white", confirmClass)}>
            {confirmLabel}
          </button>
        </div>
      </FocusTrap>
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function AdminDatasetsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<DatasetStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  // Modal state
  const [modal, setModal] = useState<{
    open: boolean;
    type: "publish" | "reject" | "archive" | "delete" | null;
    dataset: Dataset | null;
  }>({ open: false, type: null, dataset: null });

  // ── Query ─────────────────────────────────────────────────────────────────
  const { data, isLoading, isFetching, isError, refetch } = useQuery<DatasetList>({
    queryKey: ["admin-datasets", activeTab, search, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(PAGE_SIZE),
        ...(search && { q: search }),
        ...(activeTab !== "all" && { status: activeTab }),
      });
      const { data } = await api.get(`/datasets/admin-list?${params}`);
      return data;
    },
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const updateStatus = useMutation({
    mutationFn: ({ slug, status }: { slug: string; status: DatasetStatus }) =>
      api.patch(`/datasets/${slug}`, { status }),
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-datasets"] });
      const labels: Record<string, string> = {
        published: "Dataset publié ✅",
        archived: "Dataset archivé",
      };
      toast.success(labels[status] ?? "Statut mis à jour");
    },
    onError: () => toast.error("Erreur lors de la mise à jour"),
  });

  const moderateDataset = useMutation({
    mutationFn: ({ slug, action }: { slug: string; action: "approve" | "reject" }) =>
      api.post(`/datasets/${slug}/${action}`),
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-datasets"] });
      toast.success(action === "approve" ? "Dataset approuvé et publié" : "Dataset rejeté en brouillon");
    },
    onError: () => toast.error("Erreur lors de la modération"),
  });

  const deleteDataset = useMutation({
    mutationFn: (slug: string) => api.delete(`/datasets/${slug}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-datasets"] });
      toast.success("Dataset supprimé");
    },
    onError: () => toast.error("Erreur lors de la suppression"),
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  const openModal = (type: "publish" | "reject" | "archive" | "delete", dataset: Dataset) =>
    setModal({ open: true, type, dataset });
  const closeModal = () => setModal({ open: false, type: null, dataset: null });

  const handleConfirm = () => {
    if (!modal.dataset) return;
    if (modal.type === "publish")  moderateDataset.mutate({ slug: modal.dataset.slug, action: "approve" });
    if (modal.type === "reject")   moderateDataset.mutate({ slug: modal.dataset.slug, action: "reject" });
    if (modal.type === "archive")  updateStatus.mutate({ slug: modal.dataset.slug, status: "archived" });
    if (modal.type === "delete")   deleteDataset.mutate(modal.dataset.slug);
  };

  const handleTabChange = (tab: DatasetStatus | "all") => {
    setActiveTab(tab);
    setPage(1);
  };

  const handleSearch = (v: string) => {
    setSearch(v);
    setPage(1);
  };

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;
  const from = data ? (page - 1) * PAGE_SIZE + 1 : 0;
  const to = data ? Math.min(page * PAGE_SIZE, data.total) : 0;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 lg:p-8">

      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Modération des datasets</h1>
          <p className="text-gray-500 text-sm mt-1">
            {isError ? "Impossible de charger la modération" : data ? `${data.total} dataset(s) au total` : "Chargement…"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            title="Actualiser"
            aria-label="Actualiser la liste des datasets"
          >
            <RefreshCw className={cn("w-4 h-4", isFetching && "animate-spin")} />
          </button>
          <Link href="/dashboard/import" className="btn-secondary text-sm">
            <Database className="w-4 h-4" />
            Nouveau dataset
          </Link>
        </div>
      </div>

      {/* Card principale */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

        {/* Onglets statut */}
        <div className="border-b border-gray-100">
          <div className="flex items-center gap-1 px-4 pt-4 pb-0 overflow-x-auto">
            {TABS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => handleTabChange(key)}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 whitespace-nowrap transition-colors",
                  activeTab === key
                    ? "border-faso-navy text-faso-navy bg-faso-navy/5"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Barre de recherche + filtre */}
        <div className="p-4 border-b border-gray-100 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm w-full focus:outline-none focus:ring-2 focus:ring-faso-navy/20 focus:border-faso-navy/30"
            />
          </div>
          {search && (
            <button
              onClick={() => handleSearch("")}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700"
            >
              <XCircle className="w-3.5 h-3.5" />
              Effacer
            </button>
          )}
          <div className="ml-auto flex items-center gap-2 text-xs text-gray-400">
            <Filter className="w-3.5 h-3.5" />
            {data ? `${data.total} résultat(s)` : "—"}
          </div>
        </div>

        {/* Tableau */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className="text-left px-6 py-3">Dataset</th>
                <th className="text-left px-6 py-3">Catégorie</th>
                <th className="text-left px-6 py-3">Statut</th>
                <th className="text-left px-6 py-3">Données</th>
                <th className="text-left px-6 py-3">Créé le</th>
                <th className="text-right px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: `${50 + j * 10}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : isError ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-gray-400">
                    <XCircle className="w-10 h-10 mx-auto mb-3 text-red-200" />
                    <p className="font-medium text-gray-600">Impossible de charger les datasets</p>
                    <p className="text-xs mt-1">Vérifiez l'API ou réessayez dans quelques instants.</p>
                    <button
                      onClick={() => refetch()}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Réessayer
                    </button>
                  </td>
                </tr>
              ) : data?.items?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-gray-400">
                    <Database className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="font-medium text-gray-500">Aucun dataset trouvé</p>
                    <p className="text-xs mt-1">
                      {search ? "Essayez un autre terme de recherche." : "Importez un dataset ou changez de statut."}
                    </p>
                    {!search && (
                      <Link href="/dashboard/import" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#1A2C42] px-4 py-2 text-xs font-semibold text-white hover:bg-[#223a57]">
                        <Database className="w-3.5 h-3.5" />
                        Importer un dataset
                      </Link>
                    )}
                  </td>
                </tr>
              ) : (
                data?.items?.map((ds) => (
                  <tr key={ds.id} className="hover:bg-gray-50/80 transition-colors group">

                    {/* Nom + description */}
                    <td className="px-6 py-4 max-w-xs">
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                          ds.status === "published" ? "bg-green-100" :
                          ds.status === "pending"   ? "bg-yellow-100" :
                          ds.status === "archived"  ? "bg-red-50" : "bg-gray-100"
                        )}>
                          <Database className={cn(
                            "w-4 h-4",
                            ds.status === "published" ? "text-green-600" :
                            ds.status === "pending"   ? "text-yellow-600" :
                            ds.status === "archived"  ? "text-red-400" : "text-gray-400"
                          )} />
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 truncate">{ds.name}</div>
                          <div className="text-xs text-gray-400 truncate mt-0.5">
                            /{ds.slug}
                            {ds.is_geo && (
                              <span className="ml-2 text-faso-green font-medium">🌍 Géo</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Catégorie */}
                    <td className="px-6 py-4">
                      {ds.category ? (
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs font-medium">
                          {ds.category}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>

                    {/* Statut */}
                    <td className="px-6 py-4">
                      <StatusBadge status={ds.status} />
                      <div className="mt-1.5">
                        <DataOriginBadge origin={ds.data_origin} compact showSynthetic />
                      </div>
                    </td>

                    {/* Stats fichier */}
                    <td className="px-6 py-4">
                      <div className="text-xs text-gray-500 space-y-0.5">
                        {ds.row_count != null ? (
                          <div>{formatNumber(ds.row_count)} lignes</div>
                        ) : (
                          <div className="text-gray-300">Aucun fichier</div>
                        )}
                        {ds.file_size_bytes != null && (
                          <div className="text-gray-400">{formatBytes(ds.file_size_bytes)}</div>
                        )}
                        {ds.file_format && (
                          <div className="font-mono uppercase text-gray-400">{ds.file_format}</div>
                        )}
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-6 py-4 text-xs text-gray-400 whitespace-nowrap">
                      {formatDate(ds.created_at)}
                      {ds.published_at && (
                        <div className="text-green-500 mt-0.5">
                          Publié {formatDate(ds.published_at)}
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 justify-end">

                        {/* Voir la page publique */}
                        {ds.status === "published" && (
                          <Link
                            href={`/datasets/${ds.slug}`}
                            target="_blank"
                            className="p-1.5 text-gray-400 hover:text-faso-navy hover:bg-gray-100 rounded-lg transition-colors"
                            title="Voir la page publique"
                            aria-label={`Voir la page publique du dataset ${ds.name}`}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        )}

                        {/* Approuver (draft / pending) */}
                        {(ds.status === "draft" || ds.status === "pending") && (
                          <button
                            onClick={() => openModal("publish", ds)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                            title="Approuver et publier ce dataset"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Approuver
                          </button>
                        )}

                        {/* Rejeter (pending) */}
                        {ds.status === "pending" && (
                          <button
                            onClick={() => openModal("reject", ds)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                            title="Rejeter et renvoyer en brouillon"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Rejeter
                          </button>
                        )}

                        {/* Archiver (published) */}
                        {ds.status === "published" && (
                          <button
                            onClick={() => openModal("archive", ds)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors"
                            title="Archiver ce dataset"
                          >
                            <Archive className="w-3.5 h-3.5" />
                            Archiver
                          </button>
                        )}

                        {/* Ré-activer (archived) */}
                        {ds.status === "archived" && (
                          <button
                            onClick={() => updateStatus.mutate({ slug: ds.slug, status: "published" })}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                            title="Republier ce dataset"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Republier
                          </button>
                        )}

                        {/* Supprimer */}
                        <button
                          onClick={() => openModal("delete", ds)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Supprimer définitivement"
                          aria-label={`Supprimer le dataset ${ds.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.total > PAGE_SIZE && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {from}–{to} sur <strong>{data.total}</strong> datasets
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const pg = page <= 3 ? i + 1 : page - 2 + i;
                if (pg < 1 || pg > totalPages) return null;
                return (
                  <button
                    key={pg}
                    onClick={() => setPage(pg)}
                    className={cn(
                      "w-8 h-8 rounded-lg text-xs font-medium transition-colors",
                      pg === page ? "bg-faso-navy text-white" : "hover:bg-gray-100 text-gray-600"
                    )}
                  >
                    {pg}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Légende statuts */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500">
        {Object.entries(STATUS_CONFIG).map(([key, { label, color, icon: Icon }]) => (
          <span key={key} className="flex items-center gap-1.5">
            <span className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full", color)}>
              <Icon className="w-3 h-3" />
              {label}
            </span>
          </span>
        ))}
      </div>

      {/* Modal de confirmation */}
      <ConfirmModal
        open={modal.open}
        title={
          modal.type === "publish" ? "Approuver ce dataset ?" :
          modal.type === "reject" ? "Rejeter ce dataset ?" :
          modal.type === "archive" ? "Archiver ce dataset ?" :
          "Supprimer ce dataset ?"
        }
        message={
          modal.type === "publish"
            ? `"${modal.dataset?.name}" sera visible par tous les utilisateurs publics.`
            : modal.type === "reject"
            ? `"${modal.dataset?.name}" retournera en brouillon pour correction par l'organisation.`
            : modal.type === "archive"
            ? `"${modal.dataset?.name}" sera masqué du portail public. Il restera accessible aux admins.`
            : `Cette action est irréversible. "${modal.dataset?.name}" et toutes ses données seront définitivement supprimés.`
        }
        confirmLabel={
          modal.type === "publish" ? "Approuver" :
          modal.type === "reject" ? "Rejeter" :
          modal.type === "archive" ? "Archiver" : "Supprimer"
        }
        confirmClass={
          modal.type === "delete"
            ? "bg-red-500 hover:bg-red-600"
            : modal.type === "reject"
            ? "bg-red-500 hover:bg-red-600"
            : modal.type === "archive"
            ? "bg-orange-500 hover:bg-orange-600"
            : "bg-green-600 hover:bg-green-700"
        }
        onConfirm={handleConfirm}
        onClose={closeModal}
      />
    </div>
  );
}
