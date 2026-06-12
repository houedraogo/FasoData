"use client";

import Link from "next/link";
import { ArrowRight, BarChart3, Building2, Database, Download, Globe, GraduationCap, Landmark, Map, Search, Shield, Users } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import PrixDuJourWidget from "@/components/home/PrixDuJourWidget";
import { useLanguage } from "@/lib/i18n";

const categoryMeta = [
  { fr: "Agriculture", en: "Agriculture", icon: "A", count: 124, color: "bg-green-50 text-green-700 border-green-200" },
  { fr: "Sante", en: "Health", icon: "S", count: 98, color: "bg-red-50 text-red-700 border-red-200" },
  { fr: "Education", en: "Education", icon: "E", count: 76, color: "bg-blue-50 text-blue-700 border-blue-200" },
  { fr: "Economie", en: "Economy", icon: "Eco", count: 112, color: "bg-purple-50 text-purple-700 border-purple-200" },
  { fr: "Geographie", en: "Geography", icon: "G", count: 89, color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  { fr: "Environnement", en: "Environment", icon: "Env", count: 67, color: "bg-teal-50 text-teal-700 border-teal-200" },
];

export default function HomePage() {
  const { locale, t } = useLanguage();

  const stats = [
    { value: "1 200+", label: t("home.stats.datasets") },
    { value: "45", label: t("home.stats.categories") },
    { value: "320+", label: t("home.stats.partners") },
    { value: "15 000+", label: t("home.stats.downloads") },
  ];

  const features = [
    { icon: Search, title: t("home.feature.search.title"), description: t("home.feature.search.description") },
    { icon: Map, title: t("home.feature.map.title"), description: t("home.feature.map.description") },
    { icon: BarChart3, title: t("home.feature.charts.title"), description: t("home.feature.charts.description") },
    { icon: Download, title: t("home.feature.export.title"), description: t("home.feature.export.description") },
    { icon: Shield, title: t("home.feature.verified.title"), description: t("home.feature.verified.description") },
    { icon: Globe, title: t("home.feature.open.title"), description: t("home.feature.open.description") },
  ];

  const audiences = [
    {
      icon: GraduationCap,
      title: t("home.audience.academic.title"),
      description: t("home.audience.academic.description"),
      color: "bg-blue-50 text-blue-700 border-blue-100",
    },
    {
      icon: Building2,
      title: t("home.audience.business.title"),
      description: t("home.audience.business.description"),
      color: "bg-amber-50 text-amber-700 border-amber-100",
    },
    {
      icon: Users,
      title: t("home.audience.ngo.title"),
      description: t("home.audience.ngo.description"),
      color: "bg-green-50 text-green-700 border-green-100",
    },
    {
      icon: Landmark,
      title: t("home.audience.state.title"),
      description: t("home.audience.state.description"),
      color: "bg-slate-50 text-slate-700 border-slate-100",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <section className="relative bg-faso-navy overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-faso-red/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-faso-gold/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 rounded-full text-white/80 text-sm mb-6">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              {t("home.badge")}
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              {t("home.titleStart")} <span className="text-faso-red">Burkina Faso</span>{" "}
              {t("home.titleEnd")}
            </h1>

            <p className="text-lg text-white/70 mb-10 leading-relaxed max-w-2xl">
              {t("home.description")}
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/datasets" className="btn-primary text-base px-6 py-3">
                {t("home.exploreCta")} <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/carte"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition-all"
              >
                <Map className="w-5 h-5" />
                {t("home.mapCta")}
              </Link>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 60L1440 60L1440 0C1200 40 960 60 720 45C480 30 240 10 0 30L0 60Z" fill="#F9FAFB" />
          </svg>
        </div>
      </section>

      <section className="bg-gray-50 py-12 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map(({ value, label }) => (
              <div key={label} className="text-center">
                <div className="text-3xl font-bold text-faso-navy">{value}</div>
                <div className="text-sm text-gray-500 mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PrixDuJourWidget />

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-faso-navy mb-3">{t("home.categoriesTitle")}</h2>
            <p className="text-gray-500">{t("home.categoriesSubtitle")}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categoryMeta.map(({ fr, en, icon, count, color }) => {
              const name = locale === "fr" ? fr : en;
              return (
                <Link
                  key={fr}
                  href={`/datasets?category=${encodeURIComponent(fr.toLowerCase())}`}
                  className={`card p-5 text-center border hover:scale-105 transition-all cursor-pointer ${color}`}
                >
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-white/70 text-xs font-bold">
                    {icon}
                  </div>
                  <div className="font-semibold text-sm">{name}</div>
                  <div className="text-xs opacity-70 mt-1">
                    {count} {t("home.datasetsLabel")}
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="text-center mt-8">
            <Link href="/datasets" className="btn-secondary">
              {t("home.allCategories")} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-10">
            <h2 className="text-3xl font-bold text-faso-navy mb-3">{t("home.audiencesTitle")}</h2>
            <p className="text-gray-500 leading-relaxed">{t("home.audiencesSubtitle")}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {audiences.map(({ icon: Icon, title, description, color }) => (
              <div key={title} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl border ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-faso-navy mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-faso-navy mb-3">{t("home.featuresTitle")}</h2>
            <p className="text-gray-500 max-w-xl mx-auto">{t("home.featuresSubtitle")}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, description }) => (
              <div key={title} className="card p-6">
                <div className="w-12 h-12 bg-faso-navy/10 rounded-xl flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-faso-navy" />
                </div>
                <h3 className="font-bold text-faso-navy mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-faso-navy">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">{t("home.ctaTitle")}</h2>
          <p className="text-white/70 mb-8 text-lg">{t("home.ctaText")}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/inscription" className="btn-primary text-base px-8 py-3">
              <Users className="w-5 h-5" />
              {t("home.ctaAccount")}
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-8 py-3 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition-all"
            >
              {t("home.ctaContact")}
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
