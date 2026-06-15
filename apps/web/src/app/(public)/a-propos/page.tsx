"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Database, Globe, Shield, Users, BarChart3,
  Mail, Github, ExternalLink, CheckCircle, ArrowRight,
  GraduationCap, Building2, Landmark,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";

interface PublicStats { datasets: number; categories: number; downloads: number; price_observations: number; }
function fmt(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k+`;
  return n > 0 ? `${n}` : "—";
}

const STACK = [
  { name: "Next.js 15", roleKey: "Frontend",              color: "bg-gray-900 text-white" },
  { name: "FastAPI",    roleKey: "Backend",                color: "bg-green-600 text-white" },
  { name: "PostgreSQL", roleKey: "about.stack.db",         color: "bg-blue-700 text-white" },
  { name: "MinIO",      roleKey: "about.stack.storage",    color: "bg-red-600 text-white" },
  { name: "Meilisearch",roleKey: "about.stack.search",     color: "bg-purple-600 text-white" },
  { name: "Docker",     roleKey: "about.stack.infra",      color: "bg-sky-600 text-white" },
];

const CATEGORIES = [
  "Agriculture & Élevage", "Santé publique", "Éducation",
  "Économie & Finances", "Environnement", "Géographie & Démographie",
  "Infrastructure", "Sécurité alimentaire", "Gouvernance",
  "Culture & Patrimoine", "Eau & Assainissement", "Énergie",
];

const VALEURS = [
  { icon: Globe,       titleKey: "about.value.transparency.title", descKey: "about.value.transparency.desc" },
  { icon: Shield,      titleKey: "about.value.reliability.title",  descKey: "about.value.reliability.desc"  },
  { icon: Users,       titleKey: "about.value.inclusivity.title",  descKey: "about.value.inclusivity.desc"  },
  { icon: CheckCircle, titleKey: "about.value.openSource.title",   descKey: "about.value.openSource.desc"   },
];

const AUDIENCES = [
  { icon: GraduationCap, titleKey: "about.audience.academic.title", descKey: "about.audience.academic.desc" },
  { icon: Building2,     titleKey: "about.audience.business.title", descKey: "about.audience.business.desc" },
  { icon: Users,         titleKey: "about.audience.ngo.title",      descKey: "about.audience.ngo.desc"      },
  { icon: Landmark,      titleKey: "about.audience.state.title",    descKey: "about.audience.state.desc"    },
];

export default function AProposPage() {
  const { t } = useLanguage();
  const [publicStats, setPublicStats] = useState<PublicStats | null>(null);

  useEffect(() => {
    fetch("/api/datasets/public-stats")
      .then((r) => r.json())
      .then(setPublicStats)
      .catch(() => {});
  }, []);

  const STATS = [
    { value: publicStats ? fmt(publicStats.datasets) : "…",              label: t("about.statsDatasets"),   icon: Database },
    { value: publicStats ? `${publicStats.categories}` : "…",            label: t("about.statsCategories"), icon: BarChart3 },
    { value: publicStats ? fmt(publicStats.price_observations) : "…",    label: t("about.statsPrices"),     icon: Users },
    { value: "100%",                                                       label: t("about.statsOpenSource"), icon: Globe },
  ];

  return (
    <div className="bg-white">

      {/* Hero */}
      <section className="bg-faso-navy relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-faso-red/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-faso-gold/15 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-24 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 text-white/80 text-xs px-4 py-2 rounded-full mb-8 border border-white/20">
            <Globe className="w-3.5 h-3.5" />
            {t("about.badge")}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
            {t("about.title").split("FasoData")[0]}
            <span className="text-faso-gold">FasoData</span>
          </h1>
          <p className="text-white/70 text-lg max-w-2xl mx-auto leading-relaxed">
            {t("about.description")}
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-gray-100">
            {STATS.map(({ value, label, icon: Icon }) => (
              <div key={label} className="p-8 text-center">
                <div className="w-10 h-10 bg-faso-navy/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Icon className="w-5 h-5 text-faso-navy" />
                </div>
                <div className="text-3xl font-bold text-faso-navy">{value}</div>
                <div className="text-sm text-gray-500 mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl font-bold text-faso-navy mb-6">{t("about.missionTitle")}</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                {t("about.missionP1")}
              </p>
              <p className="text-gray-600 leading-relaxed mb-6">
                {t("about.missionP2")}
              </p>
              <Link href="/datasets" className="btn-primary inline-flex">
                {t("about.missionCta")}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {VALEURS.map(({ icon: Icon, titleKey, descKey }) => (
                <div key={titleKey} className="bg-gray-50 rounded-2xl p-5">
                  <div className="w-9 h-9 bg-faso-navy/10 rounded-lg flex items-center justify-center mb-3">
                    <Icon className="w-4 h-4 text-faso-navy" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1.5 text-sm">{t(titleKey)}</h3>
                  <p className="text-gray-500 text-xs leading-relaxed">{t(descKey)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-gray-50 border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mb-10">
            <h2 className="text-3xl font-bold text-faso-navy mb-3">{t("about.audiencesTitle")}</h2>
            <p className="text-gray-600 leading-relaxed">
              {t("about.audiencesSubtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {AUDIENCES.map(({ icon: Icon, titleKey, descKey }) => (
              <div key={titleKey} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="w-11 h-11 bg-faso-navy/10 rounded-xl flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-faso-navy" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{t(titleKey)}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{t(descKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Catégories */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl font-bold text-faso-navy mb-3">{t("about.domainsTitle")}</h2>
          <p className="text-gray-500 text-sm mb-10">
            {t("about.domainsSubtitle")}
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat}
                href={`/datasets?category=${encodeURIComponent(cat)}`}
                className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 hover:border-faso-navy hover:text-faso-navy transition-colors"
              >
                {cat}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Stack technique */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-faso-navy mb-2">{t("about.stackTitle")}</h2>
            <p className="text-gray-500 text-sm">
              {t("about.stackSubtitle")}
            </p>
          </div>
          <div className="flex flex-wrap gap-4 justify-center">
            {STACK.map(({ name, roleKey, color }) => {
              const role = roleKey.startsWith("about.") ? t(roleKey) : roleKey;
              return (
                <div key={name} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-5 py-3 shadow-sm">
                  <span className={`text-xs font-bold px-2 py-1 rounded-lg ${color}`}>{name}</span>
                  <span className="text-sm text-gray-500">{role}</span>
                </div>
              );
            })}
          </div>
          <div className="text-center mt-8">
            <a
              href="https://github.com/houedraogo/FasoData"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-faso-navy transition-colors"
            >
              <Github className="w-4 h-4" />
              {t("about.github")}
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </section>

      {/* Contact / CTA */}
      <section className="py-20 bg-faso-navy relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-1/4 w-64 h-64 bg-faso-red/20 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">{t("about.ctaTitle")}</h2>
          <p className="text-white/70 mb-8 leading-relaxed">
            {t("about.ctaText")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/inscription" className="btn-primary bg-faso-red hover:bg-faso-red/90 justify-center">
              {t("about.ctaCreateAccount")}
            </Link>
            <a
              href="mailto:contact@fasodata.com"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-white/20 text-white hover:bg-white/10 transition-colors text-sm font-medium"
            >
              <Mail className="w-4 h-4" />
              {t("about.ctaContact")}
            </a>
          </div>
        </div>
      </section>

    </div>
  );
}
