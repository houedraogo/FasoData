"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Database, Layers, Map, FileText,
  Bell, Users, Settings, LogOut, Search, ChevronRight,
  TrendingUp, ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

// ── Config navigation ─────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { href: "/dashboard",          icon: LayoutDashboard, label: "Vue d'ensemble" },
  { href: "/dashboard/datasets", icon: Database,        label: "Mes datasets" },
  { href: "/dashboard/programmes", icon: TrendingUp,    label: "Programmes" },
  { href: "/dashboard/prix",       icon: TrendingUp,    label: "Prix alimentaires" },
  { href: "/dashboard/validation", icon: ShieldCheck,   label: "Validation" },
  { href: "/dashboard/carte",    icon: Map,             label: "Cartographies" },
  { href: "/dashboard/rapports", icon: FileText,        label: "Rapports" },
  { href: "/dashboard/alertes",  icon: Bell,            label: "Alertes", badge: 3 },
  { href: "/dashboard/equipe",   icon: Users,           label: "Équipe" },
  { href: "/dashboard/profil",   icon: Settings,        label: "Paramètres" },
];

// ── Breadcrumb helper ─────────────────────────────────────────────────────────

function useBreadcrumb(pathname: string) {
  const labels: Record<string, string> = {
    "/dashboard":          "Vue d'ensemble",
    "/dashboard/datasets": "Mes datasets",
    "/dashboard/analyse":  "Analyse",
    "/dashboard/programmes": "Programmes",
    "/dashboard/prix":       "Prix alimentaires",
    "/dashboard/validation": "Validation",
    "/dashboard/carte":    "Cartographies",
    "/dashboard/rapports": "Rapports",
    "/dashboard/alertes":  "Alertes",
    "/dashboard/equipe":   "Équipe",
    "/dashboard/profil":   "Paramètres",
    "/dashboard/import":   "Importer",
  };
  return labels[pathname] ?? "Dashboard";
}

// ── Layout principal ─────────────────────────────────────────────────────────

export default function InstitutionalLayout({ children }: { children: React.ReactNode }) {
  const pathname  = usePathname();
  const { user, logout } = useAuth();
  const [search, setSearch] = useState("");
  const pageLabel = useBreadcrumb(pathname);

  const orgName    = user?.organization ?? "Mon Organisation";
  const rawUserName = user?.full_name ?? user?.email ?? "Utilisateur";
  const userName   = rawUserName.toLowerCase().includes("démo") || rawUserName.toLowerCase().includes("demo")
    ? "Utilisateur"
    : rawUserName;
  const userRole   = user?.role === "admin" ? "Administrateur" : user?.role === "institutional" ? "Contributeur" : "Lecteur";
  const initials   = userName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  const QUOTA_USED  = 6412;
  const QUOTA_TOTAL = 10000;
  const quotaPct    = Math.round((QUOTA_USED / QUOTA_TOTAL) * 100);

  return (
    <div className="min-h-screen flex bg-[#F8F9FB]">

      {/* ── Sidebar ── */}
      <aside className="hidden w-[200px] bg-[#1A2C42] lg:flex flex-col fixed inset-y-0 left-0 z-30 shrink-0">

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

        {/* Section label */}
        <div className="px-5 pb-3">
          <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest">Espace ONG</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2.5 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ href, icon: Icon, label, badge }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group",
                  active
                    ? "bg-white/12 text-white"
                    : "text-white/55 hover:text-white/85 hover:bg-white/8"
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
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${quotaPct}%`,
                background: quotaPct > 80 ? "#E04E2F" : quotaPct > 60 ? "#F59E0B" : "#16A34A",
              }}
            />
          </div>
          <p className="text-[10px] text-white/35">
            {QUOTA_USED.toLocaleString("fr-FR")} / {QUOTA_TOTAL.toLocaleString("fr-FR")} requêtes
          </p>
        </div>

        {/* Logout */}
        <div className="px-2.5 pb-5">
          <button
            onClick={logout}
            className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm text-white/40 hover:text-red-400 hover:bg-white/5 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* ── Contenu principal ── */}
      <div className="flex-1 min-w-0 lg:ml-[200px] flex flex-col min-h-screen">

        {/* Top bar */}
        <header className="min-h-14 bg-white border-b border-gray-100 flex items-center px-4 sm:px-6 gap-3 sm:gap-4 sticky top-0 z-20">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-sm text-gray-500 flex-1 min-w-0">
            <span className="font-medium text-gray-800">{orgName}</span>
            <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
            <span className="truncate">{pageLabel}</span>
          </div>

          {/* Recherche */}
          <div className="relative w-60 hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher dans mes données…"
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E04E2F]/20 focus:border-[#E04E2F]/30"
            />
          </div>

          {/* FR / EN */}
          <div className="text-xs text-gray-400 hidden sm:flex items-center gap-1">
            <span className="font-semibold text-gray-800">FR</span>
            <span>/</span>
            <span className="cursor-pointer hover:text-gray-600">EN</span>
          </div>

          {/* Notifs */}
          <button className="relative w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-[#E04E2F] rounded-full" />
          </button>

          {/* Avatar user */}
          <button className="flex items-center gap-2.5 pl-1">
            <div className="w-8 h-8 rounded-full bg-[#16A34A] flex items-center justify-center text-white text-xs font-bold shrink-0">
              {initials}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-gray-800 leading-none">{userName.split(" ")[0]} {userName.split(" ")[1] ?? ""}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{userRole}</p>
            </div>
          </button>
        </header>

        <nav className="lg:hidden border-b border-gray-100 bg-white px-3 py-2 overflow-x-auto">
          <div className="flex min-w-max gap-2">
            {NAV_ITEMS.map(({ href, icon: Icon, label, badge }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold whitespace-nowrap",
                    active ? "bg-[#1A2C42] text-white" : "bg-gray-50 text-gray-600"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                  {badge != null && <span className="rounded-full bg-[#E04E2F] px-1.5 py-0.5 text-[10px] text-white">{badge}</span>}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Page content */}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
