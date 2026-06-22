"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Ban,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  Search,
  UserCheck,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

type AccessRequestStatus = "pending" | "approved" | "rejected";

interface AccessRequest {
  id: string;
  email: string;
  full_name: string | null;
  organization: string;
  role: "admin" | "institutional" | "public";
  status: AccessRequestStatus;
  review_note: string | null;
  created_user_id: string | null;
  created_at: string;
  updated_at: string;
}

interface AccessRequestList {
  items: AccessRequest[];
  total: number;
  page: number;
  page_size: number;
}

const PAGE_SIZE = 12;

const STATUS_OPTIONS: Array<{ value: AccessRequestStatus | "all"; label: string }> = [
  { value: "pending", label: "En attente" },
  { value: "approved", label: "Approuvees" },
  { value: "rejected", label: "Refusees" },
  { value: "all", label: "Toutes" },
];

const STATUS_LABELS: Record<AccessRequestStatus, string> = {
  pending: "En attente",
  approved: "Approuvee",
  rejected: "Refusee",
};

const STATUS_BADGES: Record<AccessRequestStatus, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-100",
  approved: "bg-green-50 text-green-700 border-green-100",
  rejected: "bg-red-50 text-red-600 border-red-100",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DemandesAccesPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AccessRequestStatus | "all">("pending");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedQ(search.trim());
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [search]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const { data, isLoading, isFetching } = useQuery<AccessRequestList>({
    queryKey: ["admin-access-requests-page", status, page, debouncedQ],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(PAGE_SIZE),
      });
      if (status !== "all") params.set("status", status);
      if (debouncedQ) params.set("q", debouncedQ);
      const { data } = await api.get(`/users/access-requests?${params}`);
      return data;
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/users/access-requests/${id}/approve`, {});
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-access-requests-page"] });
      queryClient.invalidateQueries({ queryKey: ["admin-access-requests"] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Demande approuvee");
    },
    onError: () => toast.error("Impossible d'approuver la demande"),
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/users/access-requests/${id}/reject`, {});
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-access-requests-page"] });
      queryClient.invalidateQueries({ queryKey: ["admin-access-requests"] });
      toast.success("Demande refusee");
    },
    onError: () => toast.error("Impossible de refuser la demande"),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pendingCount = status === "pending" ? total : undefined;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Demandes d'acces</h1>
          <p className="mt-1 text-sm text-gray-500">
            Validation des organisations qui souhaitent contribuer a FasoData.
          </p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
          <div className="text-2xl font-bold text-[#1A2C42]">{pendingCount ?? total}</div>
          <div className="text-xs text-gray-400">{status === "pending" ? "en attente" : "resultats"}</div>
        </div>
      </div>

      <div className="mb-5 rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-4 py-3.5 sm:px-5">
          <div className="relative min-w-[220px] flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(event) => handleSearch(event.target.value)}
              placeholder="Nom, email, organisation..."
              className="w-full rounded-xl border border-gray-200 py-2 pl-9 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-[#E04E2F]/20"
            />
          </div>

          <div className="flex rounded-xl border border-gray-200 bg-gray-50 p-1">
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setStatus(option.value);
                  setPage(1);
                }}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                  status === option.value
                    ? "bg-white text-[#1A2C42] shadow-sm"
                    : "text-gray-500 hover:text-gray-800"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          {isFetching && !isLoading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
        </div>

        <div className="hidden grid-cols-[1.4fr_1.2fr_1fr_1fr_auto] gap-4 border-b border-gray-50 bg-gray-50/50 px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 md:grid">
          <span>Demandeur</span>
          <span>Organisation</span>
          <span>Statut</span>
          <span>Date</span>
          <span>Actions</span>
        </div>

        <div className="divide-y divide-gray-50">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="flex items-center gap-4 px-5 py-4">
                <div className="h-10 w-10 animate-pulse rounded-xl bg-gray-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 animate-pulse rounded bg-gray-100" />
                  <div className="h-3 w-32 animate-pulse rounded bg-gray-100" />
                </div>
              </div>
            ))
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center px-5 py-14 text-center">
              <UserCheck className="mb-3 h-10 w-10 text-gray-200" />
              <p className="font-medium text-gray-600">Aucune demande trouvee</p>
              <p className="mt-1 text-sm text-gray-400">Essayez un autre filtre ou une autre recherche.</p>
            </div>
          ) : (
            items.map((request) => (
              <div
                key={request.id}
                className="flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-gray-50/60 md:grid md:grid-cols-[1.4fr_1.2fr_1fr_1fr_auto] md:items-center md:gap-4 md:px-5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">{request.full_name || "Sans nom"}</p>
                  <p className="truncate text-xs text-gray-400">{request.email}</p>
                </div>
                <p className="truncate text-sm text-gray-600">{request.organization}</p>
                <span className={cn("w-fit rounded-lg border px-2.5 py-1 text-[11px] font-semibold", STATUS_BADGES[request.status])}>
                  {STATUS_LABELS[request.status]}
                </span>
                <span className="text-xs text-gray-400">{formatDate(request.created_at)}</span>
                <div className="flex items-center gap-2">
                  {request.status === "pending" ? (
                    <>
                      <button
                        onClick={() => approveMutation.mutate(request.id)}
                        disabled={approveMutation.isPending}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-green-50 px-3 py-2 text-xs font-semibold text-green-700 hover:bg-green-100 disabled:opacity-60"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Approuver
                      </button>
                      <button
                        onClick={() => rejectMutation.mutate(request.id)}
                        disabled={rejectMutation.isPending}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-60"
                      >
                        <Ban className="h-3.5 w-3.5" /> Refuser
                      </button>
                    </>
                  ) : request.created_user_id ? (
                    <a
                      href={`/admin/utilisateurs?q=${encodeURIComponent(request.email)}`}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                    >
                      Voir compte <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : (
                    <span className="text-xs text-gray-400">Traitee</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/30 px-5 py-3">
            <span className="text-xs text-gray-400">
              Page {page} / {totalPages} - {total} resultat(s)
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={page <= 1}
                className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 disabled:opacity-30"
                aria-label="Page precedente"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                disabled={page >= totalPages}
                className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 disabled:opacity-30"
                aria-label="Page suivante"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
