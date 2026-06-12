"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Database, TrendingUp, Map, FileText,
  Bell, Users, Settings, LogOut, Search, ChevronRight,
  ShieldCheck, X, Menu,
} from "lucide-react";
import { AuthGate } from "@/components/auth/AuthGate";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

// ── Config navigation ─────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { href: "/dashboard",            icon: LayoutDashboard, label: "Vue d'ensemble" },
  { href: "/dashboard/datasets",   icon: Database,        label: "Mes datasets" },
  { href: "/dashboard/programmes", icon: TrendingUp,      label: "Programmes" },
  { href: "/dashboard/prix",       icon: TrendingUp,      label: "Prix alimentaires" },
  { href: "/dashboard/validation", icon: ShieldCheck,     label: "Validation" },
  { href: "/dashboard/carte",      icon: Map,             label: "Cartographies" },
  { href: "/dashboard/rapports",   icon: FileText,        label: "Rapports" },
  { href: "/dashboard/alertes",    icon: Bell,            label: "Alertes", badge: 3 },
  { href: "/dashboard/equipe",     icon: Users,           label: "Équipe" },
  { href: "/dashboard/profil",     icon: Settings,        label: "Paramètres" },
];

// 5 items visibles dans la bottom bar mobile
const BOTTOM_NAV = [
  { href: "/dashboard",          icon: LayoutDashboard, label: "Accueil" },
  { href: "/dashboard/datasets", icon: Database,        label: "Données" },
  { href: "/dashboard/prix",     icon: TrendingUp,      label: "Prix" },
  { href: "/dashboard/carte",    icon: Map,             label: "Carte" },
  { href: "/dashboard/profil",   icon: Settings,        label: "Profil" },
];

// ── Breadcrumb helper ─────────────────────────────────────────────────────────

function useBreadcrumb(pathname: string) {
  const labels: Record<string, string> = {
    "/dashboard":              "Vue d'ensemble",
    "/dashboard/datasets":     "Mes datasets",
    "/dashboard/analyse":      "Analyse",
    "/dashboard/programmes":   "Programmes",
    "/dashboard/prix":         "Prix alimentaires",
    "/dashboard/validation":   "Validation",
    "/dashboard/carte":        "Cartographies",
    "/dashboard/rapports":     "Rapports",
    "/dashboard/alertes":      "Alertes",
    "/dashboard/equipe":       "Équipe",
    "/dashboard/profil":       "Paramètres",
    "/dashboard/import":       "Importer",
  };
  return labels[pathname] ?? "Dashboard";
}

// ── Layout principal ──────────────────────────────────────────────────────────

export default function InstitutionalLayout({ children }: { children: React.ReactNode }) {
  const pathname   = usePathname();
  const { user, logout } = useAuth();
  const [search, setSearch]   = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pageLabel  = useBreadcrumb(pathname);

  const orgName    = user?.organization ?? "Mon Organisation";
  const rawName    = user?.full_name ?? user?.email ?? "Utilisateur";
  const userName   = rawName.toLowerCase().includes("demo") ? "Utilisateur" : rawName;
  const userRole   = user?.role === "admin" ? "Administrateur"
                   : user?.role === "institutional" ? "Contributeur"
                   : "Lecteur";
  const initials   = userName.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();

  const QUOTA_USED  = 6412;
  const QUOTA_TOTAL = 10000;
  const quotaPct    = Math.round((QUOTA_USED / QUOTA_TOTAL) * 100);

  return (
    <AuthGate allowedRoles={["institutional"]}>
    <div className="min-h-screen flex bg-[#F8F9FB]">

      {/* ── Sidebar desktop (lg+) ─────────────────────────────────────────── */}
      <aside className="hidden lg:flex w-[200px] bg-[#1A2C42] flex-col fixed inset-y-0 left-0 z-30 shrink-0">

        {/* Logo */}
        <div className="px-5 pt-6 pb-5">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#E04E2F] rounded-lg flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-white" stroke="currentColor" strokeWidth={2.5}>
                <path d="M3 17l4-8 4 4 4-6 4 10" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-white font-bold text-base tracking-tight">FasoData</span>
          </Link>
        </div>

        <div className="px-5 pb-3">
          <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest">Espace ONG</p>
        </div>

        <nav className="flex-1 px-2.5 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ href, icon: Icon, label, badge }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));
            return (
              <Link key={href} href={href}
                className={cn(
                  "flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                  active ? "bg-white/12 text-white" : "text-white/55 hover:text-white/85 hover:bg-white/8"
                )}
              >
                <span className="flex items-center gap-2.5">
                  <Icon className={cn("w-4 h-4 shrink-0", active ? "text-white" : "text-white/50")} />
                  {label}
                </span>
                {badge != null && (
                  <span className="bg-[#E04E2F] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Quota API */}
        <div className="px-4 py-4 border-t border-white/8">
          <p className="text-[10px] text-white/35 font-medium mb-2">Quota API</p>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-1.5">
            <div className="h-full rounded-full transition-all"
              style={{
                width: `${quotaPct}%`,
                background: quotaPct > 80 ? "#E04E2F" : quotaPct > 60 ? "#F59E0B" : "#16A34A",
              }} />
          </div>
          <p className="text-[10px] text-white/35">
            {QUOTA_USED.toLocaleString("fr-FR")} / {QUOTA_TOTAL.toLocaleString("fr-FR")} requêtes
          </p>
        </div>

        <div className="px-2.5 pb-5">
          <button onClick={logout}
            className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm text-white/40 hover:text-red-400 hover:bg-white/5 transition-all">
            <LogOut className="w-4 h-4" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* ── Drawer mobile (overlay) ───────────────────────────────────────── */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)} />

          {/* Panel */}
          <aside className="relative w-72 max-w-[85vw] bg-[#1A2C42] flex flex-col h-full shadow-2xl">
            {/* Header drawer */}
            <div className="flex items-center justify-between px-5 pt-6 pb-5">
              <Link href="/" onClick={() => setDrawerOpen(false)} className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-[#E04E2F] rounded-lg flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-white" stroke="currentColor" strokeWidth={2.5}>
                    <path d="M3 17l4-8 4 4 4-6 4 10" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <span className="text-white font-bold text-base">FasoData</span>
              </Link>
              <button onClick={() => setDrawerOpen(false)}
                className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-white rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User info */}
            <div className="mx-4 mb-4 flex items-center gap-3 bg-white/8 rounded-xl px-3 py-3">
              <div className="w-9 h-9 rounded-full bg-[#16A34A] flex items-center justify-center text-white text-sm font-bold shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-white text-sm font-semibold truncate">{userName.split(" ")[0]}</p>
                <p className="text-white/40 text-xs">{userRole} · {orgName}</p>
              </div>
            </div>

            <p className="px-5 pb-2 text-[10px] font-semibold text-white/30 uppercase tracking-widest">Navigation</p>

            <nav className="flex-1 px-2.5 space-y-0.5 overflow-y-auto">
              {NAV_ITEMS.map(({ href, icon: Icon, label, badge }) => {
                const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));
                return (
                  <Link key={href} href={href}
                    onClick={() => setDrawerOpen(false)}
                    className={cn(
                      "flex items-center justify-between px-3 py-3 rounded-xl text-sm font-medium transition-all",
                      active ? "bg-white/12 text-white" : "text-white/60 hover:text-white/90 hover:bg-white/8"
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className={cn("w-4 h-4 shrink-0", active ? "text-[#E04E2F]" : "text-white/40")} />
                      {label}
                    </span>
                    {badge != null && (
                      <span className="bg-[#E04E2F] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        {badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            <div className="px-2.5 pb-8 pt-3 border-t border-white/8 space-y-1">
              <button onClick={() => { logout(); setDrawerOpen(false); }}
                className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-sm text-white/40 hover:text-red-400 hover:bg-white/5 transition-all">
                <LogOut className="w-4 h-4" />
                Déconnexion
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ── Contenu principal ─────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 lg:ml-[200px] flex flex-col min-h-screen">

        {/* Top bar */}
        <header className="h-14 bg-white border-b border-gray-100 flex items-center px-3 sm:px-5 gap-2 sm:gap-3 sticky top-0 z-20">

          {/* Hamburger — mobile seulement */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="lg:hidden w-9 h-9 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
            aria-label="Ouvrir le menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-sm text-gray-500 flex-1 min-w-0">
            <span className="font-medium text-gray-800 hidden sm:inline truncate max-w-[120px]">{orgName}</span>
            <ChevronRight className="w-3.5 h-3.5 text-gray-300 hidden sm:block shrink-0" />
            <span className="font-semibold text-gray-900 sm:font-normal sm:text-gray-600 truncate">{pageLabel}</span>
          </div>

          {/* Recherche — masquée sur mobile */}
          <div className="relative hidden md:block w-52 lg:w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher…"
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E04E2F]/20"
            />
          </div>

          <div
            className="hidden sm:flex items-center rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-1.5 text-[11px] font-semibold text-gray-500 shrink-0"
            title="L'espace privé FasoData est disponible en français pour cette version."
          >
            FR
          </div>

          {/* Notifications */}
          <button
            className="relative w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors shrink-0"
            aria-label="Afficher les notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#E04E2F] rounded-full" />
          </button>

          {/* Avatar */}
          <button className="flex items-center gap-2 shrink-0" aria-label="Ouvrir le menu utilisateur">
            <div className="w-8 h-8 rounded-full bg-[#16A34A] flex items-center justify-center text-white text-xs font-bold">
              {initials}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-gray-800 leading-none max-w-[80px] truncate">
                {userName.split(" ")[0]}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">{userRole}</p>
            </div>
          </button>
        </header>

        {/* Contenu de la page — pb-20 sur mobile pour le bottom nav */}
        <main className="flex-1 pb-20 lg:pb-0">
          {children}
        </main>
      </div>

      {/* ── Bottom navigation — mobile seulement (lg:hidden) ─────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-100"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="flex items-stretch h-16">
          {BOTTOM_NAV.map(({ href, icon: Icon, label }) => {
            const active = href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname === href || pathname.startsWith(href + "/");
            return (
              <Link key={href} href={href}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors",
                  active ? "text-[#E04E2F]" : "text-gray-400 hover:text-gray-600"
                )}
              >
                <Icon className={cn("w-5 h-5", active ? "text-[#E04E2F]" : "text-gray-400")} />
                {label}
              </Link>
            );
          })}
          {/* Bouton "Plus" pour accéder aux items cachés */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Ouvrir les autres rubriques"
          >
            <Menu className="w-5 h-5" />
            Plus
          </button>
        </div>
      </nav>
    </div>
    </AuthGate>
  );
}
