"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users, Globe, Database, TrendingUp, Shield,
  FileText, Settings, LogOut, ChevronRight, Mail,
  BookOpen, BarChart3,
} from "lucide-react";
import { AuthGate } from "@/components/auth/AuthGate";
import { useAuth } from "@/hooks/useAuth";
import { PRIVATE_LOCALE_HELP, PRIVATE_LOCALE_LABEL } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/admin/utilisateurs", icon: Users,      label: "Utilisateurs" },
  { href: "/admin/organisations", icon: Globe,     label: "Organisations" },
  { href: "/admin/datasets",      icon: Database,  label: "Datasets" },
  { href: "/admin/visites",       icon: BarChart3, label: "Visites" },
  { href: "/admin/prix",          icon: TrendingUp,label: "SMS Prix" },
  { href: "/admin/alertes-email", icon: Mail,      label: "Alertes email" },
  { href: "/admin/supervision",   icon: TrendingUp,label: "Supervision" },
  { href: "/admin/securite",      icon: Shield,    label: "Sécurité" },
  { href: "/admin/logs",          icon: FileText,  label: "Journaux" },
  { href: "/guide",               icon: BookOpen,  label: "Guide" },
  { href: "/admin/parametres",    icon: Settings,  label: "Réglages" },
];

function useBreadcrumb(pathname: string) {
  const item = NAV_ITEMS.find((n) => pathname.startsWith(n.href));
  return item?.label ?? "Administration";
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const pageLabel = useBreadcrumb(pathname);

  const initials = (user?.full_name ?? user?.email ?? "RZ")
    .split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <AuthGate allowedRoles={["admin"]}>
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
          <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest">Administration</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2.5 space-y-0.5">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                  active
                    ? "bg-white/12 text-white"
                    : "text-white/55 hover:text-white/85 hover:bg-white/8"
                )}
              >
                <Icon className={cn("w-4 h-4 shrink-0", active ? "text-white" : "text-white/50")} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Status opérationnel */}
        <div className="px-4 py-4 border-t border-white/8">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-[#16A34A] rounded-full animate-pulse" />
            <p className="text-[10px] text-white/50 font-medium">Système opérationnel</p>
          </div>
          <p className="text-[10px] text-white/30 mt-1 ml-4">99.94% — 30 derniers j.</p>
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

      {/* ── Contenu ── */}
      <div className="flex-1 min-w-0 lg:ml-[200px] flex flex-col min-h-screen">

        {/* Top bar */}
        <header className="min-h-14 bg-white border-b border-gray-100 flex items-center px-4 sm:px-6 gap-3 sm:gap-4 sticky top-0 z-20">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-sm text-gray-500 flex-1 min-w-0">
            <span className="font-medium text-gray-700">Administration</span>
            <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
            <span className="text-gray-900 font-medium truncate">{pageLabel}</span>
          </div>

          {/* Alerte badge */}
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-[#E04E2F] text-xs font-semibold rounded-lg border border-red-100"
            aria-label="Afficher les alertes administrateur"
          >
            <span className="w-1.5 h-1.5 bg-[#E04E2F] rounded-full" />
            2 alertes
          </button>

          {/* Niveau admin */}
          <div className="hidden sm:flex items-center gap-2 text-xs">
            <span className="text-gray-400">Admin · Niveau</span>
            <span className="font-bold text-gray-700">1</span>
          </div>

          {/* Avatar */}
          <div
            className="hidden sm:flex items-center rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-1.5 text-[11px] font-semibold text-gray-500 shrink-0"
            title={PRIVATE_LOCALE_HELP}
          >
            {PRIVATE_LOCALE_LABEL}
          </div>

          <div className="w-8 h-8 rounded-full bg-[#E04E2F] flex items-center justify-center text-white text-xs font-bold shrink-0">
            {initials}
          </div>
        </header>

        <nav className="lg:hidden border-b border-gray-100 bg-white px-3 py-2 overflow-x-auto">
          <div className="flex min-w-max gap-2">
            {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
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
                </Link>
              );
            })}
          </div>
        </nav>

        <main className="flex-1">{children}</main>
      </div>
    </div>
    </AuthGate>
  );
}
