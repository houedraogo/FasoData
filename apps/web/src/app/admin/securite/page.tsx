"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Shield, AlertTriangle, CheckCircle, Users, Lock,
  Key, Eye, EyeOff, RefreshCw, Globe, Clock,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

// ── Composant carte sécurité ──────────────────────────────────────────────────

function SecurityCard({
  title, status, icon: Icon, children,
}: {
  title: string;
  status: "ok" | "warning" | "error";
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center",
            status === "ok" ? "bg-green-100" : status === "warning" ? "bg-yellow-100" : "bg-red-100"
          )}>
            <Icon className={cn("w-4 h-4",
              status === "ok" ? "text-green-600" : status === "warning" ? "text-yellow-700" : "text-red-600"
            )} />
          </div>
          <h2 className="font-bold text-gray-900">{title}</h2>
        </div>
        <div className={cn("w-2.5 h-2.5 rounded-full",
          status === "ok" ? "bg-green-500" : status === "warning" ? "bg-yellow-500" : "bg-red-500"
        )} />
      </div>
      {children}
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function SecuritePage() {
  const [showKey, setShowKey]         = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  // Comptage utilisateurs actifs/inactifs
  const { data: usersData } = useQuery({
    queryKey: ["security-users"],
    queryFn: async () => {
      const { data } = await api.get("/users?page_size=100");
      return data;
    },
  });

  const totalUsers   = usersData?.total ?? 0;
  const activeUsers  = usersData?.items?.filter((u: { is_active: boolean }) => u.is_active).length ?? 0;
  const inactiveUsers = totalUsers - activeUsers;

  // Score de sécurité simulé
  const score = 82;
  const scoreColor = score >= 80 ? "text-green-600" : score >= 60 ? "text-yellow-600" : "text-red-600";

  const handleRegenerateKey = async () => {
    setRegenerating(true);
    await new Promise((r) => setTimeout(r, 1200));
    setRegenerating(false);
    toast.success("Clé API régénérée (simulation)");
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">

      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sécurité & Accès</h1>
          <p className="text-gray-500 text-sm mt-1">Supervision de la sécurité de la plateforme</p>
        </div>
        <div className="text-center">
          <div className={cn("text-4xl font-bold", scoreColor)}>{score}</div>
          <div className="text-xs text-gray-400 mt-0.5">Score / 100</div>
        </div>
      </div>

      {/* Vue d'ensemble */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Utilisateurs actifs",   value: activeUsers,  icon: Users,  color: "bg-green-50 text-green-600" },
          { label: "Comptes désactivés",     value: inactiveUsers,icon: Lock,   color: "bg-red-50 text-red-600" },
          { label: "Tentatives échouées",    value: 3,            icon: AlertTriangle, color: "bg-yellow-50 text-yellow-600" },
          { label: "Sessions actives (24h)", value: activeUsers,  icon: Globe,  color: "bg-blue-50 text-blue-600" },
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

        {/* Statut des services */}
        <SecurityCard title="Statut des services" status="ok" icon={CheckCircle}>
          <div className="space-y-3">
            {[
              { name: "API FastAPI",     ok: true,  detail: "Répond en < 50ms" },
              { name: "Base de données", ok: true,  detail: "PostgreSQL 16 — sain" },
              { name: "Redis",           ok: true,  detail: "Cache opérationnel" },
              { name: "MinIO",           ok: true,  detail: "Stockage disponible" },
              { name: "Meilisearch",     ok: true,  detail: "Index à jour" },
              { name: "Celery Worker",   ok: true,  detail: "3 workers actifs" },
            ].map(({ name, ok, detail }) => (
              <div key={name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full", ok ? "bg-green-500" : "bg-red-500")} />
                  <span className="text-gray-700 font-medium">{name}</span>
                </div>
                <span className="text-xs text-gray-400">{detail}</span>
              </div>
            ))}
          </div>
        </SecurityCard>

        {/* Tentatives de connexion */}
        <SecurityCard title="Authentification" status="warning" icon={AlertTriangle}>
          <div className="space-y-4">
            <div className="bg-yellow-50 rounded-xl p-4 text-sm">
              <div className="font-semibold text-yellow-800 mb-1">
                3 tentatives échouées détectées
              </div>
              <div className="text-yellow-700 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span>IP 41.207.xxx.xxx</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Il y a 52 min</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>admin@fasodata.bf (cible)</span>
                  <span className="text-yellow-600 font-medium">Alerte faible</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Durée session JWT</span>
                <span className="font-mono text-gray-800 text-xs">30 min (access)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Refresh token</span>
                <span className="font-mono text-gray-800 text-xs">7 jours</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Algorithme</span>
                <span className="font-mono text-gray-800 text-xs">HS256</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Hashage mots de passe</span>
                <span className="font-mono text-green-700 text-xs font-semibold">bcrypt (3.2.2) ✓</span>
              </div>
            </div>
          </div>
        </SecurityCard>

        {/* Clé API Meilisearch */}
        <SecurityCard title="Clé API Meilisearch" status="ok" icon={Key}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Master Key (masquée)</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 font-mono text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-gray-700">
                  {showKey ? "changeme_meili_XXXX_YYYY_ZZZZ" : "••••••••••••••••••••••••••••••"}
                </div>
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="text-xs text-gray-500 bg-blue-50 rounded-xl p-3">
              La clé est définie via la variable d'environnement <code className="font-mono bg-white px-1 rounded">MEILISEARCH_API_KEY</code> dans le fichier <code className="font-mono bg-white px-1 rounded">.env</code>.
            </div>
            <button
              onClick={handleRegenerateKey}
              disabled={regenerating}
              className="flex items-center gap-2 text-xs text-orange-600 hover:text-orange-700 font-medium"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", regenerating && "animate-spin")} />
              {regenerating ? "Régénération…" : "Régénérer la clé (nécessite redémarrage)"}
            </button>
          </div>
        </SecurityCard>

        {/* Recommandations */}
        <SecurityCard title="Recommandations" status="warning" icon={Shield}>
          <div className="space-y-3">
            {[
              { ok: true,  text: "bcrypt v3 pour les mots de passe" },
              { ok: true,  text: "CORS configuré (origine restreinte)" },
              { ok: true,  text: "Rate limiting Nginx (30 req/s)" },
              { ok: true,  text: "Tokens JWT avec expiration" },
              { ok: false, text: "HTTPS / TLS — configurer Let's Encrypt" },
              { ok: false, text: "2FA administrateur — non activé" },
              { ok: false, text: "Audit log persistant — non implémenté" },
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
