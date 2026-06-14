"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle, Globe, Key, Lock, RefreshCw, Shield, Users } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type SecurityData = {
  score: number;
  https_enabled: boolean;
  users: {
    total: number;
    active: number;
    inactive: number;
    new_24h: number;
    admin_count: number;
  };
  sessions_24h: number;
  services: Array<{ name: string; status: "ok" | "warn" | "down" }>;
  checks: Array<{ label: string; ok: boolean; points: number }>;
  jwt: {
    access_expire_minutes: number;
    refresh_expire_days: number;
    algorithm: string;
  };
};

function SecurityCard({
  title,
  status,
  icon: Icon,
  children,
}: {
  title: string;
  status: "ok" | "warning" | "pending";
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  const styles = {
    ok: "bg-green-100 text-green-600",
    warning: "bg-yellow-100 text-yellow-700",
    pending: "bg-gray-100 text-gray-500",
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", styles[status])}>
            <Icon className="w-4 h-4" />
          </div>
          <h2 className="font-bold text-gray-900">{title}</h2>
        </div>
        <div className={cn("w-2.5 h-2.5 rounded-full",
          status === "ok" ? "bg-green-500" : status === "warning" ? "bg-yellow-500" : "bg-gray-300"
        )} />
      </div>
      {children}
    </div>
  );
}

function ServiceDot({ status }: { status: "ok" | "warn" | "down" }) {
  return (
    <div className={cn("w-2 h-2 rounded-full", {
      "bg-green-500": status === "ok",
      "bg-yellow-400": status === "warn",
      "bg-red-500": status === "down",
    })} />
  );
}

export default function SecuritePage() {
  const { data, isLoading, refetch, isRefetching } = useQuery<SecurityData>({
    queryKey: ["admin-security"],
    queryFn: async () => {
      const { data } = await api.get("/dashboard/security");
      return data;
    },
    refetchInterval: 60_000,
  });

  const score = data?.score ?? null;
  const scoreColor =
    score === null ? "text-gray-400"
    : score >= 80 ? "text-green-600"
    : score >= 50 ? "text-yellow-600"
    : "text-red-600";

  const allServicesOk = data?.services.every((s) => s.status === "ok") ?? false;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sécurité & Accès</h1>
          <p className="text-gray-500 text-sm mt-1">
            Indicateurs en temps réel basés sur les données de la plateforme.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className={cn("w-4 h-4 text-gray-500", isRefetching && "animate-spin")} />
          </button>
          <div className="text-center">
            <div className={cn("text-3xl font-bold", scoreColor)}>
              {isLoading ? "…" : score !== null ? `${score}/100` : "N/A"}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">Score sécurité</div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Utilisateurs actifs",
            value: isLoading ? "…" : String(data?.users.active ?? 0),
            sub: `${data?.users.total ?? 0} au total`,
            icon: Users,
            color: "bg-green-50 text-green-600",
          },
          {
            label: "Comptes désactivés",
            value: isLoading ? "…" : String(data?.users.inactive ?? 0),
            sub: `${data?.users.admin_count ?? 0} admin(s)`,
            icon: Lock,
            color: "bg-red-50 text-red-600",
          },
          {
            label: "Nouveaux comptes 24h",
            value: isLoading ? "…" : String(data?.users.new_24h ?? 0),
            sub: "inscriptions récentes",
            icon: AlertTriangle,
            color: "bg-yellow-50 text-yellow-600",
          },
          {
            label: "Sessions actives 24h",
            value: isLoading ? "…" : String(data?.sessions_24h ?? 0),
            sub: "visiteurs distincts",
            icon: Globe,
            color: "bg-blue-50 text-blue-600",
          },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center mb-3", color)}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{label}</div>
            <div className="text-xs text-gray-400 mt-1">{sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Statut services */}
        <SecurityCard
          title="Statut des services"
          status={isLoading ? "pending" : allServicesOk ? "ok" : "warning"}
          icon={CheckCircle}
        >
          <div className="space-y-3">
            {(data?.services ?? [
              { name: "API FastAPI", status: "down" as const },
              { name: "PostgreSQL", status: "down" as const },
              { name: "Redis", status: "down" as const },
              { name: "Meilisearch", status: "down" as const },
              { name: "MinIO", status: "down" as const },
            ]).map((svc) => (
              <div key={svc.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <ServiceDot status={svc.status} />
                  <span className="text-gray-700 font-medium">{svc.name}</span>
                </div>
                <span className={cn("text-xs font-semibold", {
                  "text-green-600": svc.status === "ok",
                  "text-yellow-600": svc.status === "warn",
                  "text-red-600": svc.status === "down",
                })}>
                  {svc.status === "ok" ? "Opérationnel" : svc.status === "warn" ? "Dégradé" : "Hors ligne"}
                </span>
              </div>
            ))}
          </div>
        </SecurityCard>

        {/* Authentification */}
        <SecurityCard title="Authentification" status="ok" icon={Key}>
          <div className="space-y-3 text-sm">
            {[
              { label: "Hashage mots de passe", value: "bcrypt", ok: true },
              { label: "Algorithme JWT", value: data?.jwt.algorithm ?? "HS256", ok: true },
              {
                label: "Durée token d'accès",
                value: `${data?.jwt.access_expire_minutes ?? 60} min`,
                ok: true,
              },
              {
                label: "Durée refresh token",
                value: `${data?.jwt.refresh_expire_days ?? 7} jours`,
                ok: true,
              },
              {
                label: "HTTPS / TLS",
                value: data?.https_enabled ? "Actif" : "Non détecté",
                ok: data?.https_enabled ?? false,
              },
            ].map(({ label, value, ok }) => (
              <div key={label} className="flex items-center justify-between border-b border-gray-50 pb-3 last:border-0">
                <span className="text-gray-600">{label}</span>
                <span className={cn("font-mono text-xs font-semibold", ok ? "text-green-700" : "text-yellow-600")}>
                  {isLoading ? "…" : value}
                </span>
              </div>
            ))}
          </div>
        </SecurityCard>

        {/* Score détaillé */}
        <SecurityCard
          title="Critères de sécurité"
          status={score === null ? "pending" : score >= 80 ? "ok" : "warning"}
          icon={Shield}
        >
          <div className="space-y-3">
            {(data?.checks ?? []).map(({ label, ok, points }) => (
              <div key={label} className="flex items-start gap-2.5 text-sm">
                {ok
                  ? <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  : <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />}
                <span className={cn("flex-1", ok ? "text-gray-700" : "text-yellow-700")}>{label}</span>
                <span className={cn("text-xs font-semibold", ok ? "text-green-600" : "text-gray-400")}>
                  +{points} pts
                </span>
              </div>
            ))}
            {isLoading && (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-5 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            )}
          </div>
        </SecurityCard>

        {/* Accès admin */}
        <SecurityCard
          title="Comptes administrateurs"
          status={data && data.users.admin_count > 3 ? "warning" : "ok"}
          icon={Users}
        >
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {isLoading ? "…" : data?.users.admin_count ?? 0}
              </div>
              <div className="text-sm text-gray-500">compte(s) avec rôle admin</div>
            </div>
            {data && data.users.admin_count > 3 && (
              <div className="bg-yellow-50 rounded-xl p-3 text-xs text-yellow-700">
                Nombre élevé d'admins — vérifiez que chaque compte est légitime.
              </div>
            )}
            <div className="text-xs text-gray-500 space-y-1">
              <div className="flex justify-between">
                <span>Utilisateurs totaux</span>
                <span className="font-semibold text-gray-800">{isLoading ? "…" : data?.users.total ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Comptes actifs</span>
                <span className="font-semibold text-green-700">{isLoading ? "…" : data?.users.active ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Comptes désactivés</span>
                <span className="font-semibold text-red-600">{isLoading ? "…" : data?.users.inactive ?? 0}</span>
              </div>
            </div>
          </div>
        </SecurityCard>
      </div>
    </div>
  );
}
