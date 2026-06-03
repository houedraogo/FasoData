"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Search, Database, ArrowRight, Loader2, X, Clock,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SearchHit {
  id?: string;
  _index?: string;
  [key: string]: unknown;
}

interface SearchResult {
  hits: SearchHit[];
  total: number;
  page: number;
  page_size: number;
}

// ── Extrait le nom du dataset depuis l'index Meilisearch ──────────────────────

function indexToDatasetSlug(index: string) {
  // "dataset_abc123_def456" → slug approximatif
  return index.replace(/^dataset_/, "").replace(/_/g, "-");
}

// ── Mise en surbrillance du terme cherché ─────────────────────────────────────

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

// ── Page principale ───────────────────────────────────────────────────────────

function RechercheContent() {
  const searchParams  = useSearchParams();
  const router        = useRouter();
  const initialQ      = searchParams.get("q") ?? "";

  const [input, setInput] = useState(initialQ);
  const [q, setQ]         = useState(initialQ);
  const [page, setPage]   = useState(1);
  const PAGE_SIZE = 20;

  // Soumettre la recherche
  const handleSearch = useCallback((val: string) => {
    const trimmed = val.trim();
    setQ(trimmed);
    setPage(1);
    if (trimmed) {
      router.replace(`/recherche?q=${encodeURIComponent(trimmed)}`, { scroll: false });
    } else {
      router.replace("/recherche", { scroll: false });
    }
  }, [router]);

  // Mise à jour sur changement de param URL
  useEffect(() => {
    const urlQ = searchParams.get("q") ?? "";
    setInput(urlQ);
    setQ(urlQ);
  }, [searchParams]);

  // Requête Meilisearch
  const { data, isLoading, isError } = useQuery<SearchResult>({
    queryKey: ["search", q, page],
    queryFn: async () => {
      const { data } = await api.get(
        `/search?q=${encodeURIComponent(q)}&page=${page}&page_size=${PAGE_SIZE}`
      );
      return data;
    },
    enabled: q.length >= 1,
  });

  const hits       = data?.hits ?? [];
  const total      = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Grouper par dataset (index Meilisearch)
  const grouped = hits.reduce<Record<string, SearchHit[]>>((acc, hit) => {
    const idx = hit._index ?? "unknown";
    if (!acc[idx]) acc[idx] = [];
    acc[idx].push(hit);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Barre de recherche sticky */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="text-faso-navy hover:text-faso-red transition-colors">
            <Database className="w-6 h-6" />
          </Link>
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSearch(input); }}
              placeholder="Rechercher dans les données FasoData…"
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
          <button
            onClick={() => handleSearch(input)}
            className="btn-primary py-2.5 px-5 shrink-0"
          >
            Rechercher
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* État initial */}
        {!q && (
          <div className="text-center py-20 text-gray-300">
            <Search className="w-12 h-12 mx-auto mb-4" />
            <p className="text-base font-medium text-gray-400">
              Tapez un mot-clé pour rechercher dans les données
            </p>
            <p className="text-sm text-gray-300 mt-2">
              La recherche porte sur le contenu des datasets importés dans Meilisearch.
            </p>
          </div>
        )}

        {/* Chargement */}
        {q && isLoading && (
          <div className="flex items-center justify-center py-20 gap-3 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Recherche en cours…</span>
          </div>
        )}

        {/* Erreur */}
        {q && isError && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center text-red-600 text-sm">
            La recherche a échoué. Vérifiez que Meilisearch est disponible.
          </div>
        )}

        {/* Résultats */}
        {q && !isLoading && !isError && (
          <>
            {/* Résumé */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-gray-600">
                {total === 0 ? (
                  <>Aucun résultat pour <strong>"{q}"</strong></>
                ) : (
                  <><strong>{total}</strong> résultat(s) pour <strong>"{q}"</strong></>
                )}
              </p>
              {total > 0 && (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Via Meilisearch
                </span>
              )}
            </div>

            {/* Aucun résultat */}
            {total === 0 && (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <Search className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                <p className="font-medium text-gray-500 mb-2">Aucune donnée trouvée</p>
                <p className="text-xs text-gray-400 mb-6">
                  Essayez des termes différents ou explorez les datasets disponibles.
                </p>
                <Link href="/datasets" className="btn-primary text-sm">
                  Explorer les datasets
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}

            {/* Résultats groupés par dataset */}
            {Object.entries(grouped).map(([indexName, indexHits]) => {
              const slug = indexToDatasetSlug(indexName);
              return (
                <div key={indexName} className="mb-6">
                  {/* En-tête du groupe */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-faso-navy">
                      <Database className="w-4 h-4" />
                      <span>{slug}</span>
                      <span className="text-xs font-normal text-gray-400">
                        — {indexHits.length} résultat(s)
                      </span>
                    </div>
                    <Link
                      href={`/datasets/${slug}`}
                      className="text-xs text-faso-red hover:underline flex items-center gap-1"
                    >
                      Voir le dataset <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>

                  {/* Cartes résultats */}
                  <div className="space-y-2">
                    {indexHits.map((hit, i) => {
                      const fields = Object.entries(hit).filter(
                        ([k]) => !k.startsWith("_") && k !== "id"
                      );
                      return (
                        <div
                          key={i}
                          className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:border-faso-navy/20 transition-colors"
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {fields.slice(0, 6).map(([key, val]) => (
                              <div key={key} className="text-xs">
                                <span className="text-gray-400 block mb-0.5">{key}</span>
                                <span className="text-gray-800 font-medium">
                                  <Highlight
                                    text={String(val ?? "")}
                                    query={q}
                                  />
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-8">
                <span className="text-sm text-gray-500">
                  Page {page} / {totalPages}
                </span>
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
  );
}

// Export enveloppé dans Suspense (requis pour useSearchParams en prod Next.js 15)
export default function RecherchePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Chargement…</div>
      </div>
    }>
      <RechercheContent />
    </Suspense>
  );
}
