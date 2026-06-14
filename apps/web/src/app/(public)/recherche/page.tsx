"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Search, Database, ArrowRight, Loader2, X, Clock,
  ChevronLeft, ChevronRight, SlidersHorizontal, Tag,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SearchHit {
  id?: string;
  _index?: string;
  _dataset_id?: string;
  _dataset_name?: string;
  _category?: string;
  [key: string]: unknown;
}

interface SearchResult {
  hits: SearchHit[];
  total: number;
  page: number;
  page_size: number;
}

interface Facets {
  categories: Array<{ value: string; count: number }>;
  origins:    Array<{ value: string; count: number }>;
  formats:    Array<{ value: string; count: number }>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query || !text) return <>{text}</>;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part)
          ? <mark key={i} className="bg-faso-gold/30 text-faso-navy rounded px-0.5 not-italic font-semibold">{part}</mark>
          : <span key={i}>{part}</span>
      )}
    </>
  );
}

// ── Composant filtre ──────────────────────────────────────────────────────────

function FacetSection({
  title,
  options,
  value,
  onChange,
  allLabel,
}: {
  title: string;
  options: Array<{ value: string; count: number; label?: string }>;
  value: string;
  onChange: (v: string) => void;
  allLabel: string;
}) {
  if (!options.length) return null;
  return (
    <div className="mb-5">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{title}</h3>
      <div className="space-y-1">
        <button
          onClick={() => onChange("")}
          className={cn("w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-sm transition-colors",
            !value ? "bg-faso-navy text-white" : "text-gray-600 hover:bg-gray-100")}
        >
          <span>{allLabel}</span>
        </button>
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value === value ? "" : opt.value)}
            className={cn("w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-sm transition-colors",
              value === opt.value ? "bg-faso-navy text-white" : "text-gray-600 hover:bg-gray-100")}
          >
            <span className="truncate text-left">{opt.label ?? opt.value}</span>
            <span className={cn("text-xs ml-2 shrink-0", value === opt.value ? "text-white/70" : "text-gray-400")}>
              {opt.count}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────

function RechercheContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const router       = useRouter();

  const ORIGIN_LABELS: Record<string, string> = {
    public:      t("search.origin.public"),
    field:       t("search.origin.field"),
    user_upload: t("search.origin.userUpload"),
    manual:      t("search.origin.manual"),
  };
  const initialQ     = searchParams.get("q") ?? "";

  const [input,      setInput]      = useState(initialQ);
  const [q,          setQ]          = useState(initialQ);
  const [category,   setCategory]   = useState(searchParams.get("category") ?? "");
  const [origin,     setOrigin]     = useState(searchParams.get("origin") ?? "");
  const [fileFormat, setFileFormat] = useState(searchParams.get("format") ?? "");
  const [page,       setPage]       = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const PAGE_SIZE = 20;

  const buildUrl = useCallback((newQ: string, cat: string, ori: string, fmt: string) => {
    const p = new URLSearchParams();
    if (newQ)  p.set("q", newQ);
    if (cat)   p.set("category", cat);
    if (ori)   p.set("origin", ori);
    if (fmt)   p.set("format", fmt);
    return `/recherche${p.toString() ? `?${p}` : ""}`;
  }, []);

  const handleSearch = useCallback((val: string) => {
    const trimmed = val.trim();
    setQ(trimmed);
    setPage(1);
    router.replace(buildUrl(trimmed, category, origin, fileFormat), { scroll: false });
  }, [router, category, origin, fileFormat, buildUrl]);

  const applyFilter = useCallback((type: "category" | "origin" | "format", val: string) => {
    const cat = type === "category" ? val : category;
    const ori = type === "origin"   ? val : origin;
    const fmt = type === "format"   ? val : fileFormat;
    if (type === "category") setCategory(val);
    if (type === "origin")   setOrigin(val);
    if (type === "format")   setFileFormat(val);
    setPage(1);
    router.replace(buildUrl(q, cat, ori, fmt), { scroll: false });
  }, [router, q, category, origin, fileFormat, buildUrl]);

  useEffect(() => {
    const urlQ = searchParams.get("q") ?? "";
    setInput(urlQ);
    setQ(urlQ);
    setCategory(searchParams.get("category") ?? "");
    setOrigin(searchParams.get("origin") ?? "");
    setFileFormat(searchParams.get("format") ?? "");
  }, [searchParams]);

  // Facettes
  const { data: facets } = useQuery<Facets>({
    queryKey: ["search-facets"],
    queryFn: async () => { const { data } = await api.get("/search/facets"); return data; },
    staleTime: 5 * 60 * 1000,
  });

  // Résultats
  const { data, isLoading, isError } = useQuery<SearchResult>({
    queryKey: ["search", q, category, origin, fileFormat, page],
    queryFn: async () => {
      const params = new URLSearchParams({ q, page: String(page), page_size: String(PAGE_SIZE) });
      if (category)   params.set("category", category);
      if (origin)     params.set("origin", origin);
      if (fileFormat) params.set("file_format", fileFormat);
      const { data } = await api.get(`/search?${params}`);
      return data;
    },
    enabled: q.length >= 1,
  });

  const hits       = data?.hits ?? [];
  const total      = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const grouped = hits.reduce<Record<string, SearchHit[]>>((acc, hit) => {
    const key = hit._dataset_id ?? hit._index ?? "unknown";
    if (!acc[key]) acc[key] = [];
    acc[key].push(hit);
    return acc;
  }, {});

  const activeFilters = [category, origin, fileFormat].filter(Boolean).length;

  const originOptions = (facets?.origins ?? []).map((o) => ({
    ...o,
    label: ORIGIN_LABELS[o.value] ?? o.value,
  }));

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Barre de recherche sticky */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="text-faso-navy hover:text-faso-red transition-colors shrink-0">
            <Database className="w-6 h-6" />
          </Link>
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSearch(input); }}
              placeholder={t("search.placeholder")}
              className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-faso-navy/20 focus:border-faso-navy/30"
              autoFocus
            />
            {input && (
              <button
                onClick={() => { setInput(""); handleSearch(""); }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button onClick={() => handleSearch(input)} className="btn-primary py-2.5 px-5 shrink-0">
            {t("search.button")}
          </button>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={cn("relative flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors shrink-0",
              showFilters || activeFilters > 0
                ? "border-faso-navy bg-faso-navy text-white"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50")}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">{t("search.filters")}</span>
            {activeFilters > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-faso-red text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {activeFilters}
              </span>
            )}
          </button>
        </div>

        {/* Filtres actifs — chips */}
        {activeFilters > 0 && (
          <div className="max-w-6xl mx-auto px-4 pb-3 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-400">{t("search.filterLabel")}</span>
            {category && (
              <button onClick={() => applyFilter("category", "")}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-faso-navy/10 text-faso-navy text-xs rounded-full font-medium hover:bg-faso-navy/20">
                <Tag className="w-3 h-3" /> {category} <X className="w-3 h-3" />
              </button>
            )}
            {origin && (
              <button onClick={() => applyFilter("origin", "")}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-faso-navy/10 text-faso-navy text-xs rounded-full font-medium hover:bg-faso-navy/20">
                {ORIGIN_LABELS[origin] ?? origin} <X className="w-3 h-3" />
              </button>
            )}
            {fileFormat && (
              <button onClick={() => applyFilter("format", "")}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-faso-navy/10 text-faso-navy text-xs rounded-full font-medium hover:bg-faso-navy/20">
                {fileFormat.toUpperCase()} <X className="w-3 h-3" />
              </button>
            )}
            <button onClick={() => { applyFilter("category", ""); setOrigin(""); setFileFormat(""); }}
              className="text-xs text-gray-400 hover:text-red-500 underline ml-1">
              {t("search.clearAll")}
            </button>
          </div>
        )}
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex gap-6">

          {/* Panneau filtres */}
          {showFilters && (
            <aside className="w-56 shrink-0">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sticky top-28">
                <h2 className="font-bold text-gray-900 mb-4 text-sm">{t("search.refine")}</h2>

                <FacetSection
                  title={t("search.category")}
                  options={facets?.categories ?? []}
                  value={category}
                  onChange={(v) => applyFilter("category", v)}
                  allLabel={t("search.all")}
                />
                <FacetSection
                  title={t("search.source")}
                  options={originOptions}
                  value={origin}
                  onChange={(v) => applyFilter("origin", v)}
                  allLabel={t("search.all")}
                />
                <FacetSection
                  title={t("search.format")}
                  options={(facets?.formats ?? []).map((f) => ({ ...f, label: f.value.toUpperCase() }))}
                  value={fileFormat}
                  onChange={(v) => applyFilter("format", v)}
                  allLabel={t("search.all")}
                />
              </div>
            </aside>
          )}

          {/* Résultats */}
          <div className="flex-1 min-w-0">

            {/* État initial */}
            {!q && (
              <div className="text-center py-20 text-gray-300">
                <Search className="w-12 h-12 mx-auto mb-4" />
                <p className="text-base font-medium text-gray-400">
                  {t("search.typing")}
                </p>
                <p className="text-sm text-gray-300 mt-2">
                  {t("search.typingDesc")}
                </p>
              </div>
            )}

            {q && isLoading && (
              <div className="flex items-center justify-center py-20 gap-3 text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">{t("search.loading")}</span>
              </div>
            )}

            {q && isError && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center text-red-600 text-sm">
                {t("search.error")}
              </div>
            )}

            {q && !isLoading && !isError && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <p className="text-sm text-gray-600">
                    {total === 0
                      ? <>{t("search.noData")} <strong>"{q}"</strong></>
                      : <><strong>{total}</strong> {t("search.resultsFor")} <strong>"{q}"</strong></>}
                  </p>
                  {total > 0 && (
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> Via Meilisearch
                    </span>
                  )}
                </div>

                {total === 0 && (
                  <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <Search className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                    <p className="font-medium text-gray-500 mb-2">{t("search.noData")}</p>
                    <p className="text-xs text-gray-400 mb-6">
                      {activeFilters > 0 ? t("search.noDataFilter") : t("search.noDataTerms")}
                    </p>
                    <Link href="/datasets" className="btn-primary text-sm">
                      {t("search.exploreDatasets")} <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                )}

                {/* Résultats groupés par dataset */}
                {Object.entries(grouped).map(([key, groupHits]) => {
                  const first = groupHits[0];
                  const dsName = first._dataset_name ?? key;
                  const dsId   = first._dataset_id ?? key;
                  const cat    = first._category;
                  return (
                    <div key={key} className="mb-6">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-faso-navy">
                          <Database className="w-4 h-4 shrink-0" />
                          <span className="truncate">{dsName}</span>
                          {cat && (
                            <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                              {cat}
                            </span>
                          )}
                          <span className="text-xs font-normal text-gray-400">
                            — {groupHits.length} résultat(s)
                          </span>
                        </div>
                        <Link
                          href={`/datasets/${dsId}`}
                          className="text-xs text-faso-red hover:underline flex items-center gap-1 shrink-0"
                        >
                          {t("search.viewDataset")} <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>

                      <div className="space-y-2">
                        {groupHits.map((hit, i) => {
                          const fields = Object.entries(hit).filter(
                            ([k]) => !k.startsWith("_") && k !== "id"
                          );
                          return (
                            <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:border-faso-navy/20 transition-colors">
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {fields.slice(0, 6).map(([key, val]) => (
                                  <div key={key} className="text-xs">
                                    <span className="text-gray-400 block mb-0.5">{key}</span>
                                    <span className="text-gray-800 font-medium">
                                      <Highlight text={String(val ?? "")} query={q} />
                                    </span>
                                  </div>
                                ))}
                              </div>
                              {fields.length > 6 && (
                                <p className="text-xs text-gray-400 mt-2">
                                  +{fields.length - 6} champ(s) supplémentaire(s)
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-8">
                    <span className="text-sm text-gray-500">{t("search.page")} {page} / {totalPages}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                        className={cn("p-2 rounded-xl border transition-colors",
                          page === 1 ? "opacity-40 cursor-not-allowed bg-white border-gray-100"
                                     : "bg-white border-gray-200 hover:border-faso-navy")}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                        disabled={page >= totalPages}
                        className={cn("p-2 rounded-xl border transition-colors",
                          page >= totalPages ? "opacity-40 cursor-not-allowed bg-white border-gray-100"
                                             : "bg-white border-gray-200 hover:border-faso-navy")}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RecherchePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading…</div>
      </div>
    }>
      <RechercheContent />
    </Suspense>
  );
}
