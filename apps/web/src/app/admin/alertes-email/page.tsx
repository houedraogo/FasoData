"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bell,
  CheckCircle,
  Mail,
  PauseCircle,
  Play,
  RefreshCw,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type AlertStatus = {
  total_subscriptions: number;
  active_confirmed: number;
  pending_confirmation: number;
  smtp_configured: boolean;
  smtp_mode: string;
  whatsapp_configured: boolean;
  whatsapp_mode: string;
  check_schedule: string;
};

type Subscription = {
  id: string;
  email: string;
  whatsapp_number: string | null;
  commodity: string;
  region: string;
  threshold_price: number;
  is_confirmed: boolean;
  is_active: boolean;
  alert_count: number;
  last_alerted_at: string | null;
  last_price_alerted: number | null;
  created_at: string;
};

type SubscriptionList = {
  items: Subscription[];
  total: number;
  page: number;
  page_size: number;
};

const COMMODITIES: Record<string, string> = {
  sorghum: "Sorgho",
  rice_local: "Riz local",
  maize: "Mais",
  millet: "Mil",
  cowpea: "Niebe",
  groundnut: "Arachide",
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function AdminEmailAlertsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [draftThresholds, setDraftThresholds] = useState<Record<string, string>>({});

  const activeParam = filter === "all" ? "" : `&active=${filter === "active"}`;

  const { data: status, isLoading: statusLoading } = useQuery<AlertStatus>({
    queryKey: ["alerts-email-status"],
    queryFn: async () => {
      const { data } = await api.get("/alerts/status");
      return data;
    },
  });

  const { data: subscriptions, isLoading } = useQuery<SubscriptionList>({
    queryKey: ["alerts-email-subscriptions", filter],
    queryFn: async () => {
      const { data } = await api.get(`/alerts/subscriptions?page_size=100${activeParam}`);
      return data;
    },
  });

  const rows = useMemo(() => {
    const items = subscriptions?.items ?? [];
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) =>
      [item.email, item.whatsapp_number, item.region, item.commodity, COMMODITIES[item.commodity]]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [search, subscriptions?.items]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["alerts-email-status"] });
    queryClient.invalidateQueries({ queryKey: ["alerts-email-subscriptions"] });
  };

  const updateSubscription = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<Subscription> }) =>
      api.patch(`/alerts/subscriptions/${id}`, payload),
    onSuccess: () => {
      setMessage("Abonnement mis a jour.");
      refresh();
    },
    onError: () => setMessage("Mise a jour impossible. Verifiez vos droits admin."),
  });

  const deleteSubscription = useMutation({
    mutationFn: async (id: string) => api.delete(`/alerts/subscriptions/${id}`),
    onSuccess: () => {
      setMessage("Abonnement supprime.");
      refresh();
    },
    onError: () => setMessage("Suppression impossible."),
  });

  const triggerCheck = useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/alerts/trigger-check");
      return data as { task_id: string; message: string };
    },
    onSuccess: (data) => {
      setMessage(`${data.message} Tache : ${data.task_id}`);
      refresh();
    },
    onError: () => setMessage("Declenchement impossible. Verifiez Celery et vos droits admin."),
  });

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-[#E04E2F] ring-1 ring-red-100">
            <Mail className="h-3.5 w-3.5" /> Alertes prix email + WhatsApp
          </span>
          <h1 className="mt-3 text-2xl font-bold text-gray-900">Abonnements alertes prix</h1>
          <p className="mt-1 text-sm text-gray-500">Gestion des abonnes email et WhatsApp, avec verification manuelle des seuils prix.</p>
        </div>
        <button
          onClick={() => triggerCheck.mutate()}
          disabled={triggerCheck.isPending}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1A2C42] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {triggerCheck.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          Lancer un check manuel
        </button>
      </div>

      {message && (
        <div className="rounded-xl border border-gray-100 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm">
          {message}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-5">
        {[
          { label: "Abonnements", value: statusLoading ? "..." : status?.total_subscriptions ?? 0, icon: Bell, tone: "bg-blue-50 text-blue-600" },
          { label: "Actifs confirmes", value: statusLoading ? "..." : status?.active_confirmed ?? 0, icon: CheckCircle, tone: "bg-green-50 text-green-700" },
          { label: "En attente", value: statusLoading ? "..." : status?.pending_confirmation ?? 0, icon: AlertTriangle, tone: "bg-amber-50 text-amber-700" },
          { label: "SMTP", value: status?.smtp_configured ? "Actif" : "Simulation", icon: Mail, tone: status?.smtp_configured ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600" },
          { label: "WhatsApp", value: status?.whatsapp_configured ? "Actif" : "Simulation", icon: Bell, tone: status?.whatsapp_configured ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600" },
        ].map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className={cn("mb-4 flex h-10 w-10 items-center justify-center rounded-xl", tone)}>
              <Icon className="h-5 w-5" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {[
              ["all", "Tous"],
              ["active", "Actifs"],
              ["inactive", "Inactifs"],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key as typeof filter)}
                className={cn(
                  "rounded-xl px-3 py-2 text-xs font-bold",
                  filter === key ? "bg-[#1A2C42] text-white" : "bg-gray-50 text-gray-600"
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-[#1A2C42]/15"
              placeholder="Email, WhatsApp, region, produit..."
            />
          </div>
        </div>
        <p className="mt-3 text-xs text-gray-500">
          Verification programmee : {status?.check_schedule ?? "8h00 - 14h00 - 20h00 WAT"} · Email : {status?.smtp_mode ?? "-"} · WhatsApp : {status?.whatsapp_mode ?? "-"}
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="grid min-w-[1080px] grid-cols-[1.35fr_.95fr_.75fr_.75fr_.75fr_.65fr_.75fr_1fr] gap-4 border-b border-gray-100 bg-gray-50 px-5 py-3 text-xs font-bold uppercase tracking-wide text-gray-500">
          <span>Abonne</span>
          <span>WhatsApp</span>
          <span>Produit</span>
          <span>Region</span>
          <span>Seuil</span>
          <span>Statut</span>
          <span>Alertes</span>
          <span>Actions</span>
        </div>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="min-w-[1080px] px-5 py-8 text-sm text-gray-500">Chargement des abonnements...</div>
          ) : rows.length === 0 ? (
            <div className="min-w-[1080px] px-5 py-8 text-sm text-gray-500">Aucun abonnement trouve.</div>
          ) : (
            rows.map((sub) => (
              <div key={sub.id} className="grid min-w-[1080px] grid-cols-[1.35fr_.95fr_.75fr_.75fr_.75fr_.65fr_.75fr_1fr] items-center gap-4 border-b border-gray-50 px-5 py-4 text-sm last:border-0">
                <div>
                  <p className="font-semibold text-gray-900">{sub.email}</p>
                  <p className="text-xs text-gray-400">Cree le {formatDate(sub.created_at)}</p>
                </div>
                <span className="text-gray-600">{sub.whatsapp_number || "-"}</span>
                <span className="font-semibold text-gray-700">{COMMODITIES[sub.commodity] ?? sub.commodity}</span>
                <span className="text-gray-600">{sub.region}</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    value={draftThresholds[sub.id] ?? String(Math.round(sub.threshold_price))}
                    onChange={(event) => setDraftThresholds((prev) => ({ ...prev, [sub.id]: event.target.value }))}
                    className="w-20 rounded-lg border border-gray-200 px-2 py-1.5 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-[#1A2C42]/15"
                    aria-label={`Seuil ${sub.email}`}
                  />
                  <button
                    onClick={() => updateSubscription.mutate({ id: sub.id, payload: { threshold_price: Number(draftThresholds[sub.id] ?? sub.threshold_price) } })}
                    className="rounded-lg bg-gray-50 px-2 py-1.5 text-xs font-bold text-gray-600"
                  >
                    OK
                  </button>
                </div>
                <span className={cn(
                  "inline-flex w-fit items-center gap-1 rounded-full px-2 py-1 text-xs font-bold",
                  sub.is_active && sub.is_confirmed ? "bg-green-50 text-green-700" : sub.is_confirmed ? "bg-gray-100 text-gray-600" : "bg-amber-50 text-amber-700"
                )}>
                  {sub.is_active && sub.is_confirmed ? <CheckCircle className="h-3 w-3" /> : sub.is_confirmed ? <PauseCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                  {sub.is_active && sub.is_confirmed ? "Actif" : sub.is_confirmed ? "Pause" : "Non confirme"}
                </span>
                <div>
                  <p className="font-semibold text-gray-900">{sub.alert_count}</p>
                  <p className="text-xs text-gray-400">{sub.last_price_alerted ? `${sub.last_price_alerted} CFA` : "Jamais"}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!sub.is_confirmed && (
                    <button
                      onClick={() => updateSubscription.mutate({ id: sub.id, payload: { is_confirmed: true, is_active: true } })}
                      className="rounded-lg bg-green-50 px-2.5 py-1.5 text-xs font-bold text-green-700"
                    >
                      Confirmer
                    </button>
                  )}
                  <button
                    onClick={() => updateSubscription.mutate({ id: sub.id, payload: { is_active: !sub.is_active } })}
                    className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-bold text-gray-700"
                  >
                    {sub.is_active ? "Pause" : "Activer"}
                  </button>
                  <button
                    onClick={() => deleteSubscription.mutate(sub.id)}
                    className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-bold text-[#E04E2F]"
                    aria-label={`Supprimer ${sub.email}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
