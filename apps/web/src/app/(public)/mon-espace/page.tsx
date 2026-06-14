"use client";

export const dynamic = "force-dynamic";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Bell, BellOff, Database, ExternalLink, Leaf, LogOut,
  Mail, Map, Pencil, Search, TrendingUp, User,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { AuthGate } from "@/components/auth/AuthGate";

// ── Types ──────────────────────────────────────────────────────────────────────

interface AlertSub {
  id: string;
  email: string;
  commodity: string;
  region: string | null;
  threshold_pct: number;
  is_active: boolean;
  is_confirmed: boolean;
  created_at: string;
}

interface Preferences {
  domains: string[];
  data_types: string[];
  regions: string[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const DOMAIN_LABELS: Record<string, string> = {
  prices:    "Prix alimentaires",
  health:    "Santé",
  education: "Éducation",
  water:     "Eau & assainissement",
  territory: "Territoire & cartographie",
};

const COMMODITY_LABELS: Record<string, string> = {
  sorghum: "Sorgho",
  maize:   "Maïs",
  millet:  "Mil",
  rice:    "Riz",
  beans:   "Niébé",
  groundnut_oil: "Huile arachide",
  sugar:   "Sucre",
};

// ── Composant principal ────────────────────────────────────────────────────────

function MonEspaceContent() {
  const router  = useRouter();
  const { user, logout } = useAuth();

  const { data: alerts = [], isLoading: alertsLoading } = useQuery<AlertSub[]>({
    queryKey: ["my-alerts"],
    queryFn:  () => api.get("/alerts/me").then((r) => r.data),
  });

  const { data: prefs } = useQuery<Preferences>({
    queryKey: ["my-prefs"],
    queryFn:  () => api.get("/dashboard/preferences").then((r) => r.data),
  });

  const activeAlerts   = alerts.filter((a) => a.is_active && a.is_confirmed);
  const pendingAlerts  = alerts.filter((a) => !a.is_confirmed);

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">

      {/* ── En-tête profil ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#1A2C42] flex items-center justify-center text-white text-xl font-bold shrink-0">
              {(user?.full_name || user?.email || "?").charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#1A2C42]">
                {user?.full_name || "Mon espace"}
              </h1>
              <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-0.5">
                <Mail className="w-3.5 h-3.5" />
                {user?.email}
              </p>
              <span className="inline-block mt-1.5 text-xs font-medium bg-gray-100 text-gray-500 px-2.5 py-0.5 rounded-full">
                Compte public
              </span>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Déconnexion
          </button>
        </div>
      </div>

      {/* ── Accès rapides ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: "/datasets",  icon: Database,   label: "Datasets",   color: "text-[#1A2C42]", bg: "bg-[#1A2C42]/8" },
          { href: "/recherche", icon: Search,      label: "Recherche",  color: "text-purple-600", bg: "bg-purple-50" },
          { href: "/carte",     icon: Map,         label: "Carte",      color: "text-teal-600",  bg: "bg-teal-50" },
          { href: "/carte-prix",icon: TrendingUp,  label: "Prix",       color: "text-orange-600",bg: "bg-orange-50" },
        ].map(({ href, icon: Icon, label, color, bg }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all text-center"
          >
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <span className="text-xs font-semibold text-gray-700">{label}</span>
          </Link>
        ))}
      </div>

      {/* ── Alertes prix ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-[#1A2C42] flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#E04E2F]" />
            Mes alertes prix
          </h2>
          <Link
            href="/datasets/prix-alimentaires-burkina-faso"
            className="text-xs text-[#E04E2F] font-medium hover:underline flex items-center gap-1"
          >
            Gérer <ExternalLink className="w-3 h-3" />
          </Link>
        </div>

        {alertsLoading ? (
          <div className="text-sm text-gray-400 py-4 text-center">Chargement…</div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-6">
            <BellOff className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400 mb-3">Aucune alerte configurée</p>
            <Link
              href="/datasets/prix-alimentaires-burkina-faso"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-[#E04E2F] px-4 py-2 rounded-xl hover:bg-[#c73e22] transition-colors"
            >
              <Bell className="w-3.5 h-3.5" />
              Créer une alerte
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {pendingAlerts.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs text-amber-700 flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 shrink-0" />
                {pendingAlerts.length} alerte{pendingAlerts.length > 1 ? "s" : ""} en attente de confirmation email
              </div>
            )}
            {activeAlerts.map((a) => (
              <div key={a.id} className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
                  <span className="font-medium text-gray-800">
                    {COMMODITY_LABELS[a.commodity] ?? a.commodity}
                  </span>
                  {a.region && (
                    <span className="text-xs text-gray-400">· {a.region}</span>
                  )}
                </div>
                <span className="text-xs font-semibold text-[#E04E2F]">
                  ± {a.threshold_pct}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Thématiques ── */}
      {prefs && prefs.domains.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-[#1A2C42] flex items-center gap-2">
              <Leaf className="w-4 h-4 text-green-500" />
              Mes thématiques
            </h2>
            <Link
              href="/onboarding"
              className="text-xs text-gray-400 hover:text-[#E04E2F] flex items-center gap-1 transition-colors"
            >
              <Pencil className="w-3 h-3" />
              Modifier
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {prefs.domains.map((d) => (
              <span
                key={d}
                className="inline-flex items-center gap-1.5 text-xs font-medium bg-[#1A2C42]/6 text-[#1A2C42] px-3 py-1.5 rounded-full"
              >
                {DOMAIN_LABELS[d] ?? d}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Devenir partenaire ── */}
      <div className="bg-gradient-to-br from-[#1A2C42] to-[#0f1e30] rounded-2xl p-6 text-white">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
            <User className="w-5 h-5 text-[#F5A623]" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold mb-1">Vous représentez une organisation ?</h3>
            <p className="text-white/70 text-sm leading-relaxed mb-4">
              Accédez à l'espace institutionnel pour publier vos données, suivre des programmes et recevoir des rapports personnalisés.
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 text-sm font-semibold bg-[#E04E2F] text-white px-4 py-2.5 rounded-xl hover:bg-[#c73e22] transition-colors"
            >
              Demander un accès institutionnel
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

    </div>
  );
}

export default function MonEspacePage() {
  return (
    <AuthGate allowedRoles={["public", "institutional", "admin"]}>
      <Suspense>
        <MonEspaceContent />
      </Suspense>
    </AuthGate>
  );
}
