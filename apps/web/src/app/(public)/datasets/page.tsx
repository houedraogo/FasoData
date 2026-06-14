"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Search, Download, Eye, Database, Tag, AlertTriangle, RefreshCw, XCircle, ArrowUpDown } from "lucide-react";
import { api } from "@/lib/api";
import { formatBytes, formatDate, formatNumber } from "@/lib/utils";
import { DataOriginBadge } from "@/components/ui/DataOriginBadge";
import { useLanguage } from "@/lib/i18n";

const categories = ["Agriculture", "Santé", "Éducation", "Économie", "Géographie", "Environnement", "Sécurité", "Social"];

type Dataset = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string | null;
  tags: string[];
  license: string;
  status: string;
  data_origin?: string | null;
  file_format: string | null;
  file_size_bytes: number | null;
  row_count: number | null;
  download_count: number;
  view_count: number;
  created_at: string;
};

export default function DatasetsPage() {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("recent");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["datasets", search, category, sort, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        page_size: "12",
        status: "published",
        sort,
        ...(search && { q: search }),
        ...(category && { category }),
      });
      const { data } = await api.get(`/datasets?${params}`);
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-faso-navy py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-white mb-2">{t("datasets.title")}</h1>
          <p className="text-white/70">
            {isError ? t("datasets.catalogueUnavailable") : data?.total ? formatNumber(data.total) : "—"} {t("datasets.available")}
          </p>

          {/* Barre de recherche */}
          <div className="mt-6 flex flex-wrap gap-3 max-w-3xl">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder={t("datasets.searchPlaceholder")}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-11 pr-4 py-3 bg-white rounded-xl border-0 text-sm focus:outline-none focus:ring-2 focus:ring-faso-red/30 shadow-sm"
              />
            </div>
            <select
              value={category}
              onChange={(e) => { setCategory(e.target.value); setPage(1); }}
              className="px-4 py-3 bg-white rounded-xl border-0 text-sm focus:outline-none focus:ring-2 focus:ring-faso-red/30 shadow-sm text-gray-700"
            >
              <option value="">{t("datasets.allCategories")}</option>
              {categories.map((c) => (
                <option key={c} value={c.toLowerCase()}>{c}</option>
              ))}
            </select>
            <select
              value={sort}
              onChange={(e) => { setSort(e.target.value); setPage(1); }}
              className="px-4 py-3 bg-white rounded-xl border-0 text-sm focus:outline-none focus:ring-2 focus:ring-faso-red/30 shadow-sm text-gray-700"
            >
              <option value="recent">{t("datasets.sortRecent")}</option>
              <option value="popular">{t("datasets.sortPopular")}</option>
              <option value="downloads">{t("datasets.sortDownloads")}</option>
              <option value="name">{t("datasets.sortName")}</option>
            </select>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
                <div className="h-3 bg-gray-100 rounded w-full mb-2" />
                <div className="h-3 bg-gray-100 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="card p-10 text-center">
            <AlertTriangle className="w-12 h-12 text-amber-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700">{t("datasets.loadError")}</h3>
            <p className="text-gray-400 mt-2 text-sm">{t("datasets.loadErrorDesc")}</p>
            <button
              onClick={() => refetch()}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-faso-navy px-4 py-2 text-sm font-semibold text-white hover:bg-faso-navy/90"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
              {t("datasets.retry")}
            </button>
          </div>
        ) : data?.items?.length === 0 ? (
          <div className="text-center py-20">
            <Database className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-500">{t("datasets.noResults")}</h3>
            <p className="text-gray-400 mt-2">
              {search || category ? t("datasets.noResultsFilter") : t("datasets.noResultsEmpty")}
            </p>
            {(search || category) && (
              <button
                onClick={() => { setSearch(""); setCategory(""); setPage(1); }}
                className="mt-5 inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                <XCircle className="w-4 h-4" />
                {t("datasets.resetFilters")}
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data?.items?.map((ds: Dataset) => (
                <DatasetCard key={ds.id} dataset={ds} />
              ))}
            </div>

            {/* Pagination */}
            {data?.total > 12 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="btn-secondary disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 text-sm"
                >
                  {t("datasets.prev")}
                </button>
                <span className="text-sm text-gray-500 px-4">
                  {t("datasets.page")} {page} / {Math.ceil(data.total / 12)}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page * 12 >= data.total}
                  className="btn-secondary disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 text-sm"
                >
                  {t("datasets.next")}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function DatasetCard({ dataset }: { dataset: Dataset }) {
  const { t } = useLanguage();
  const licenseColors: Record<string, string> = {
    open: "bg-green-100 text-green-700",
    "cc-by": "bg-blue-100 text-blue-700",
    "cc-by-sa": "bg-indigo-100 text-indigo-700",
    "cc-by-nc": "bg-orange-100 text-orange-700",
    proprietary: "bg-gray-100 text-gray-600",
  };

  return (
    <Link href={`/datasets/${dataset.slug}`} className="card p-5 block group">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-faso-navy group-hover:text-faso-red transition-colors line-clamp-2 text-sm leading-snug">
            {dataset.name}
          </h3>
          {dataset.category && (
            <span className="inline-flex items-center gap-1 mt-1 text-xs text-gray-500">
              <Tag className="w-3 h-3" />
              {dataset.category}
            </span>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <DataOriginBadge origin={dataset.data_origin} compact />
          <span className={`badge ${licenseColors[dataset.license] || "bg-gray-100 text-gray-600"}`}>
            {dataset.license}
          </span>
        </div>
      </div>

      {dataset.description && (
        <p className="text-xs text-gray-500 line-clamp-2 mb-4 leading-relaxed">
          {dataset.description}
        </p>
      )}

      <div className="flex items-center gap-4 text-xs text-gray-400 pt-3 border-t border-gray-100">
        {dataset.row_count && (
          <span className="flex items-center gap-1">
            <Database className="w-3.5 h-3.5" />
            {formatNumber(dataset.row_count)} {t("datasets.rows")}
          </span>
        )}
        {dataset.file_size_bytes && (
          <span>{formatBytes(dataset.file_size_bytes)}</span>
        )}
        <span className="flex items-center gap-1 ml-auto">
          <Eye className="w-3.5 h-3.5" />
          {formatNumber(dataset.view_count)}
        </span>
        <span className="flex items-center gap-1">
          <Download className="w-3.5 h-3.5" />
          {formatNumber(dataset.download_count)}
        </span>
      </div>
    </Link>
  );
}
