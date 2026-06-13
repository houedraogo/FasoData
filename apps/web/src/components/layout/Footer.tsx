"use client";

import Image from "next/image";
import Link from "next/link";
import { Github, Mail } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="bg-faso-navy text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <Image src="/picto.png" alt="FasoData" width={36} height={36} className="w-9 h-9 rounded-lg object-cover shrink-0" />
              <span className="font-bold text-lg">
                Faso<span className="font-light text-faso-red">Data</span>
              </span>
            </div>
            <p className="text-white/60 text-sm leading-relaxed">{t("footer.tagline")}</p>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-white/90">{t("footer.platform")}</h3>
            <ul className="space-y-2.5">
              {[
                [t("footer.explore"), "/datasets"],
                [t("nav.map"), "/carte"],
                [t("footer.guide"), "/guide"],
                [t("footer.publicApi"), "/developers"],
                [t("footer.statistics"), "/tableau-de-bord"],
              ].map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="text-white/60 hover:text-white text-sm transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-white/90">{t("footer.organization")}</h3>
            <ul className="space-y-2.5">
              {[
                [t("nav.about"), "/a-propos"],
                [t("footer.partners"), "/a-propos#partenaires"],
                [t("nav.contact"), "/contact"],
                [t("footer.legal"), "/mentions-legales"],
              ].map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="text-white/60 hover:text-white text-sm transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-white/90">{t("footer.contribute")}</h3>
            <ul className="space-y-2.5">
              {[
                [t("nav.signUp"), "/auth/inscription"],
                [t("footer.publish"), "/dashboard/import"],
                [t("footer.docs"), "/guide"],
              ].map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="text-white/60 hover:text-white text-sm transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-3 mt-6">
              <a href="mailto:contact@fasodata.bf" className="text-white/60 hover:text-white transition-colors">
                <Mail className="w-5 h-5" />
              </a>
              <a href="https://github.com" className="text-white/60 hover:text-white transition-colors">
                <Github className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-white/50 text-sm">
            © {new Date().getFullYear()} FasoData. {t("footer.rights")}
          </p>
          <div className="flex items-center gap-1 text-white/40 text-xs">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            {t("footer.status")}
          </div>
        </div>
      </div>
    </footer>
  );
}
