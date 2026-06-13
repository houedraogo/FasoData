"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BookOpen, ChevronRight, Code2, Database, Info, Mail, Map, Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/datasets", labelKey: "nav.datasets", icon: Database },
  { href: "/carte", labelKey: "nav.map", icon: Map },
  { href: "/carte-prix", labelKey: "nav.priceMap", icon: Map },
  { href: "/guide", labelKey: "nav.guide", icon: BookOpen },
  { href: "/developers", labelKey: "nav.api", icon: Code2 },
  { href: "/a-propos", labelKey: "nav.about", icon: Info },
  { href: "/contact", labelKey: "nav.contact", icon: Mail },
];

function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useLanguage();
  const options: Locale[] = ["fr", "en"];

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-white/15 bg-white/10 p-1",
        compact && "w-full justify-center"
      )}
      role="group"
      aria-label={t("nav.languageLabel")}
    >
      {options.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => setLocale(item)}
          className={cn(
            "min-w-9 rounded-full px-2.5 py-1 text-xs font-bold uppercase transition-colors",
            locale === item ? "bg-white text-faso-navy shadow-sm" : "text-white/60 hover:text-white"
          )}
          aria-pressed={locale === item}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-faso-navy/95 backdrop-blur-md border-b border-white/10 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center group">
            <Image
              src="/logo.png"
              alt="FasoData"
              width={160}
              height={48}
              className="h-10 w-auto group-hover:opacity-90 transition-opacity"
              priority
            />
          </Link>

          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map(({ href, labelKey }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  pathname === href || pathname.startsWith(href + "/")
                    ? "bg-white/15 text-white"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                )}
              >
                {t(labelKey)}
              </Link>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-3">
            <LanguageToggle />
            {user ? (
              <>
                <Link
                  href={user.role === "admin" ? "/admin" : "/dashboard"}
                  className="text-sm text-white/70 hover:text-white transition-colors"
                >
                  {user.full_name || user.email}
                </Link>
                <Link
                  href={user.role === "admin" ? "/admin" : "/dashboard"}
                  className="btn-primary text-sm py-2"
                >
                  {t("nav.workspace")} <ChevronRight className="w-4 h-4" />
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/auth/connexion"
                  className="text-sm text-white/70 hover:text-white transition-colors"
                >
                  {t("nav.signIn")}
                </Link>
                <Link href="/auth/inscription" className="btn-primary text-sm py-2">
                  {t("nav.signUp")}
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            className="lg:hidden text-white/80 hover:text-white"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {menuOpen && (
          <div className="lg:hidden py-4 border-t border-white/10 space-y-1">
            {navLinks.map(({ href, labelKey, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-4 py-3 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                onClick={() => setMenuOpen(false)}
              >
                <Icon className="w-4 h-4" />
                {t(labelKey)}
              </Link>
            ))}
            <div className="pt-3 border-t border-white/10 space-y-2">
              <LanguageToggle compact />
              {user ? (
                <Link
                  href="/dashboard"
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-faso-red text-white font-semibold rounded-xl"
                  onClick={() => setMenuOpen(false)}
                >
                  {t("nav.workspace")}
                </Link>
              ) : (
                <>
                  <Link
                    href="/auth/connexion"
                    className="block text-center py-2.5 text-white/80 hover:text-white"
                    onClick={() => setMenuOpen(false)}
                  >
                    {t("nav.signIn")}
                  </Link>
                  <Link
                    href="/auth/inscription"
                    className="flex items-center justify-center gap-2 w-full py-2.5 bg-faso-red text-white font-semibold rounded-xl"
                    onClick={() => setMenuOpen(false)}
                  >
                    {t("nav.signUp")}
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
