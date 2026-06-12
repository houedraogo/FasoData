"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle, Clock, Globe, Key, Lock, Shield, Users } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

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
        <div
          className={cn(
            "w-2.5 h-2.5 rounded-full",
            status === "ok" ? "bg-green-500" : status === "warning" ? "bg-yellow-500" : "bg-gray-300"
          )}
        />
      </div>
      {children}
    </div>
  );
}

export default function SecuritePage() {
  const { data: usersData } = useQuery({
    queryKey: ["security-users"],
    queryFn: async () => {
      const { data } = await api.get("/users?page_size=100");
      return data;
    },
  });

  const totalUsers = usersData?.total ?? 0;
  const activeUsers = usersData?.items?.filter((u: { is_active: boolean }) => u.is_active).length ?? 0;
  const inactiveUsers = totalUsers - activeUsers;
  const hasSecurityTelemetry = false;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sécurité & Accès</h1>
          <p className="text-gray-500 text-sm mt-1">
            Vue de contrôle basée sur les données disponibles dans l'API.
          </p>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-500">N/A</div>
          <div className="text-xs text-gray-400 mt-0.5">Score non instrumenté</div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Utilisateurs actifs", value: activeUsers, icon: Users, color: "bg-green-50 text-green-600" },
          { label: "Comptes désactivés", value: inactiveUsers, icon: Lock, color: "bg-red-50 text-red-600" },
          { label: "Tentatives échouées", value: hasSecurityTelemetry ? 0 : "N/A", icon: AlertTriangle, color: "bg-yellow-50 text-yellow-600" },
          { label: "Sessions actives (24h)", value: hasSecurityTelemetry ? 0 : "N/A", icon: Globe, color: "bg-blue-50 text-blue-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center mb-3", color)}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SecurityCard title="Statut des services" status="pending" icon={CheckCircle}>
          <div className="space-y-3">
            {["API FastAPI", "Base de données", "Redis", "MinIO", "Meilisearch", "Celery Worker"].map((name) => (
              <div key={name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-gray-300" />
                  <span className="text-gray-700 font-medium">{name}</span>
                </div>
                <span className="text-xs text-gray-400">À connecter à /dashboard/supervision</span>
              </div>
            ))}
          </div>
        </SecurityCard>

        <SecurityCard title="Authentification" status="warning" icon={AlertTriangle}>
          <div className="space-y-4">
            <div className="bg-yellow-50 rounded-xl p-4 text-sm">
              <div className="font-semibold text-yellow-800 mb-1">Journal d'authentification non connecté</div>
              <div className="text-yellow-700 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span>Endpoint d'audit sécurité à brancher</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> En attente</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Tentatives échouées, IP et sessions</span>
                  <span className="text-yellow-600 font-medium">Non instrumenté</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Durée session JWT</span>
                <span className="font-mono text-gray-800 text-xs">30 min access</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Refresh token</span>
                <span className="font-mono text-gray-800 text-xs">7 jours</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Hashage mots de passe</span>
                <span className="font-mono text-green-700 text-xs font-semibold">bcrypt</span>
              </div>
            </div>
          </div>
        </SecurityCard>

        <SecurityCard title="Clé API Meilisearch" status="pending" icon={Key}>
          <div className="space-y-4 text-sm">
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 font-mono text-xs text-gray-500">
              Gérée côté serveur via MEILISEARCH_API_KEY
            </div>
            <p className="text-xs text-gray-500">
              La régénération d'une clé nécessite une opération serveur et un redémarrage des services concernés.
            </p>
            <button
              type="button"
              disabled
              className="text-xs font-medium text-gray-400 cursor-not-allowed"
            >
              Régénération indisponible dans l'interface
            </button>
          </div>
        </SecurityCard>

        <SecurityCard title="Recommandations" status="warning" icon={Shield}>
          <div className="space-y-3">
            {[
              { ok: true, text: "Mots de passe hashés avec bcrypt" },
              { ok: true, text: "Tokens JWT avec expiration" },
              { ok: false, text: "HTTPS / TLS à configurer en production" },
              { ok: false, text: "2FA administrateur non activé" },
              { ok: false, text: "Audit log sécurité non instrumenté" },
            ].map(({ ok, text }) => (
              <div key={text} className="flex items-start gap-2.5 text-sm">
                {ok
                  ? <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  : <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />}
                <span className={ok ? "text-gray-600" : "text-yellow-700"}>{text}</span>
              </div>
            ))}
          </div>
        </SecurityCard>
      </div>
    </div>
  );
}
