"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Database, Upload, Search, ExternalLink, Trash2,
  Eye, Download, Clock, CheckCircle, AlertCircle,
  Archive, ChevronRight, Plus, FileText,
} from "lucide-react";
import { api } from "@/lib/api";
import { formatDate, formatNumber, formatBytes } from "@/lib/utils";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

// ── Types ─────────────────────────────────────────────────────────────────────

type Status = "draft" | "pending" | "published" | "archived";

interface Dataset {
  id: string; slug: string; name: string;
  description: string | null; category: string | null;
  status: Status; license: string;
  file_format: string | null; file_size_bytes: number | null;
  row_count: number | null; download_count: number; view_count: number;
  created_at: string; updated_at: string; published_at: string | null;
}

// ── Config statuts ─────────────────────────────────────────────────────────

const STATUS: Record<Status, { label: string; color: string; icon: React.ElementType }> = {
  draft:     { label: "Brouillon",  color: "text-gray-500 bg-gray-100",    icon: FileText },
  pending:   { label: "En attente", color: "text-yellow-700 bg-yellow-100", icon: Clock },
  published: { label: "Publié",     color: "text-green-700 bg-green-100",   icon: CheckCircle },
  archived:  { label: "Archivé",    color: "text-red-500 bg-red-50",        icon: Archive },
};

const TABS: { key: Status | "all"; label: string }[] = [
  { key: "all",       label: "Tous" },
  { key: "published", label: "Publiés" },
  { key: "draft",     label: "Brouillons" },
  { key: "pending",   label: "En attente" },
  { key: "archived",  label: "Archivés" },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MesDatasetsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab]       = useState<Status | "all">("all");
  const [search, setSearch] = useState("");
  const [page, setPage]     = useState(1);
  const PAGE = 12;

  const { data, isLoading } = useQuery({
    queryKey: ["my-datasets-list", tab, search, page],
    queryFn: async () => {
      const p = new URLSearchParams({
        page: String(page), page_size: String(PAGE),
        ...(search && { q: search }),
        ...(tab !== "all" && { status: tab }),
      });
      const { data } = await api.get(`/datasets/my?${p}`);
      return data as { items: Dataset[]; total: number };
    },
  });

  const deleteDs = useMutation({
    mutationFn: (slug: string) => api.delete(`/datasets/${slug}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-datasets-list"] });
      toast.success("Dataset supprimé");
    },
    onError: () => toast.error("Erreur lors de la suppression"),
  });

  const handleTab = (t: Status | "all") => { setTab(t); setPage(1); };
  const handleSearch = (v: string)       => { setSearch(v); setPage(1); };

  const total      = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE);

  return (
    <div className="p-6 lg:p-8">

      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-faso-navy">Mes datasets</h1>
          <p className="text-gray-500 text-sm mt-1">{total} dataset(s) au total</p>
        </div>
        <Link href="/dashboard/import" className="btn-primary">
          <Plus className="w-4 h-4" />
          Importer un dataset
        </Link>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

        {/* Onglets */}
        <div className="flex items-center gap-1 px-4 pt-4 pb-0 border-b border-gray-100 overflow-x-auto">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleTab(key)}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 whitespace-nowrap transition-colors",
                tab === key
                  ? "border-faso-navy text-faso-navy bg-faso-navy/5"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Recherche */}
        <div className="p-4 border-b border-gray-100">
          <div className="relative max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom…"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm w-full focus:outline-none focus:ring-2 focus:ring-faso-navy/20"
            />
          </div>
        </div>

        {/* Contenu */}
        {isLoading ? (
          <div className="divide-y divide-gray-100">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-6 py-5 flex items-center gap-4 animate-pulse">
                <div className="w-10 h-10 bg-gray-100 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-1/3" />
                  <div className="h-3 bg-gray-50 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : data?.items?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-300">
            <Database className="w-12 h-12 mb-4" />
            <p className="text-base font-medium text-gray-500">
              {search ? "Aucun résultat" : "Aucun dataset pour l'instant"}
            </p>
            {!search && (
              <Link href="/dashboard/import" className="btn-primary mt-5 text-sm">
                <Upload className="w-4 h-4" />
                Importer mon premier dataset
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {data?.items?.map((ds) => {
              const s = STATUS[ds.status];
              const Icon = s.icon;
              return (
                <div key={ds.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50/60 transition-colors group">

                  {/* Icône statut */}
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", s.color)}>
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Infos principales */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 text-sm truncate">{ds.name}</span>
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", s.color)}>{s.label}</span>
                      {ds.category && (
                        <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{ds.category}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-400 flex-wrap">
                      <span>{formatDate(ds.created_at)}</span>
                      {ds.row_count != null && <span>{formatNumber(ds.row_count)} lignes</span>}
                      {ds.file_size_bytes != null && <span>{formatBytes(ds.file_size_bytes)}</span>}
                      {ds.file_format && (
                        <span className="font-mono uppercase bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                          {ds.file_format}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Métriques */}
                  <div className="hidden md:flex items-center gap-5 text-xs text-gray-400 shrink-0">
                    <span className="flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5" /> {formatNumber(ds.view_count)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Download className="w-3.5 h-3.5" /> {formatNumber(ds.download_count)}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {ds.status === "published" && (
                      <Link
                        href={`/datasets/${ds.slug}`}
                        target="_blank"
                        className="p-2 text-gray-400 hover:text-faso-navy hover:bg-gray-100 rounded-lg transition-colors"
                        title="Voir la page publique"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    )}
                    <Link
                      href={`/datasets/${ds.slug}`}
                      className="p-2 text-gray-400 hover:text-faso-navy hover:bg-gray-100 rounded-lg transition-colors"
                      title="Voir"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => {
                        if (window.confirm(`Supprimer "${ds.name}" ? Cette action est irréversible.`))
                          deleteDs.mutate(ds.slug);
                      }}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between text-sm">
            <span className="text-xs text-gray-500">
              Page {page} / {totalPages} — {total} résultat(s)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40"
              >Précédent</button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40"
              >Suivant</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
