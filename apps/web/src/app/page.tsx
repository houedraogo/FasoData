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

  const showcase =
    locale === "fr"
      ? {
          eyebrow: "Apercu de la plateforme",
          title: "Une interface claire pour passer des donnees a la decision",
          subtitle:
            "FasoData rassemble catalogue public, suivi des prix, cartes regionales et indicateurs d'impact dans un meme espace.",
          dashboard: "Tableau de bord ONG",
          dashboardSubtitle: "KPIs, alertes et suivi programme",
          map: "Carte interactive",
          mapSubtitle: "Prix alimentaires par region",
          catalog: "Catalogue public",
          catalogSubtitle: "Datasets fiables et exportables",
          published: "publie",
          verified: "verifie",
          api: "API",
        }
      : {
          eyebrow: "Platform preview",
          title: "A clear interface from data to decisions",
          subtitle:
            "FasoData brings the public catalog, food price monitoring, regional maps and impact indicators into one workspace.",
          dashboard: "NGO dashboard",
          dashboardSubtitle: "KPIs, alerts and program tracking",
          map: "Interactive map",
          mapSubtitle: "Food prices by region",
          catalog: "Public catalog",
          catalogSubtitle: "Reliable datasets and exports",
          published: "published",
          verified: "verified",
          api: "API",
        };

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
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.06)_0,rgba(255,255,255,0)_38%),radial-gradient(circle_at_top_right,rgba(239,75,43,0.18),transparent_38%)]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
          <div className="flex flex-col lg:flex-row lg:items-center lg:gap-12">

            {/* ── Texte gauche ── */}
            <div className="flex-1 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 rounded-full text-white/80 text-sm mb-6">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                {t("home.badge")}
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
                {t("home.titleStart")} <span className="text-faso-red">Burkina Faso</span>{" "}
                {t("home.titleEnd")}
              </h1>

              <p className="text-lg text-white/70 mb-10 leading-relaxed">
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

            {/* ── Illustration droite ── */}
            <div className="hidden lg:flex flex-shrink-0 w-[420px] xl:w-[480px] flex-col gap-3 mt-10 lg:mt-0">
              {/* Card principale — stats live */}
              <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-5">
                <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-3">Prix des céréales · Burkina Faso</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Sorgho", price: "312", unit: "CFA/kg", trend: "+2.1%", up: true },
                    { label: "Maïs", price: "302", unit: "CFA/kg", trend: "-0.8%", up: false },
                    { label: "Mil", price: "350", unit: "CFA/kg", trend: "+1.4%", up: true },
                  ].map((item) => (
                    <div key={item.label} className="bg-white/8 rounded-xl p-3">
                      <p className="text-white/50 text-[10px] mb-1">{item.label}</p>
                      <p className="text-white font-bold text-lg leading-none">{item.price}</p>
                      <p className="text-white/40 text-[9px] mt-0.5">{item.unit}</p>
                      <p className={`text-[10px] font-semibold mt-1.5 ${item.up ? "text-green-400" : "text-red-400"}`}>{item.trend}</p>
                    </div>
                  ))}
                </div>
                {/* Mini sparkline SVG */}
                <div className="mt-3 h-12 opacity-40">
                  <svg viewBox="0 0 380 48" className="w-full h-full">
                    <polyline points="0,38 50,30 100,35 150,22 200,28 250,18 300,24 380,14" fill="none" stroke="#F5A623" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <polyline points="0,42 50,38 100,40 150,32 200,36 250,28 300,34 380,22" fill="none" stroke="#E04E2F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 2"/>
                  </svg>
                </div>
              </div>

              {/* Deux mini-cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#E04E2F]/30 flex items-center justify-center shrink-0">
                    <Database className="w-5 h-5 text-[#E04E2F]" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-xl leading-none">1 200+</p>
                    <p className="text-white/50 text-xs mt-0.5">Datasets publics</p>
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center shrink-0">
                    <BarChart3 className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-xl leading-none">15k+</p>
                    <p className="text-white/50 text-xs mt-0.5">Téléchargements/mois</p>
                  </div>
                </div>
              </div>

              {/* Tag sources */}
              <div className="flex items-center gap-2 flex-wrap">
                {["WFP", "SONAGESS", "INSD", "Ministères", "ONG"].map((src) => (
                  <span key={src} className="px-2.5 py-1 bg-white/8 border border-white/12 rounded-full text-white/60 text-xs font-medium">{src}</span>
                ))}
                <span className="text-white/30 text-xs">· sources vérifiées</span>
              </div>
            </div>

          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 60L1440 60L1440 0C1200 40 960 60 720 45C480 30 240 10 0 30L0 60Z" fill="#F9FAFB" />
          </svg>
        </div>
      </section>

      <section className="bg-gray-50 py-14 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-faso-red mb-3">{showcase.eyebrow}</p>
              <h2 className="text-3xl lg:text-4xl font-bold text-faso-navy leading-tight mb-4">{showcase.title}</h2>
              <p className="text-gray-600 leading-relaxed max-w-xl">{showcase.subtitle}</p>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.16fr_0.84fr]">
              <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-faso-red" />
                    <span className="h-2.5 w-2.5 rounded-full bg-faso-gold" />
                    <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
                  </div>
                  <span className="text-xs font-semibold text-gray-400">dashboard.fasodata.com</span>
                </div>

                <div className="p-5">
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-faso-navy">{showcase.dashboard}</h3>
                      <p className="text-xs text-gray-500 mt-1">{showcase.dashboardSubtitle}</p>
                    </div>
                    <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">Live</span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-5">
                    {[
                      ["1 200+", "Datasets"],
                      ["3 026", "Prix"],
                      ["13", "Regions"],
                    ].map(([value, label]) => (
                      <div key={label} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                        <div className="text-xl font-black text-faso-navy">{value}</div>
                        <div className="text-[11px] font-semibold uppercase text-gray-400">{label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="h-44 rounded-xl border border-gray-100 bg-white px-4 py-3">
                    <div className="flex items-center gap-2 mb-4">
                      <BarChart3 className="h-4 w-4 text-faso-red" />
                      <span className="text-xs font-bold text-gray-600">Prix du mil par region</span>
                    </div>
                    <div className="flex h-28 items-end gap-3">
                      {[58, 76, 48, 86, 64, 72, 54, 92, 69].map((height, index) => (
                        <div key={index} className="flex flex-1 flex-col items-center gap-2">
                          <div
                            className="w-full rounded-t-md bg-faso-red"
                            style={{ height: `${height}%`, minHeight: 22 }}
                          />
                          <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-faso-navy">{showcase.map}</h3>
                      <p className="text-xs text-gray-500">{showcase.mapSubtitle}</p>
                    </div>
                    <Map className="h-5 w-5 text-faso-red" />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {["Sahel", "Nord", "Est", "Centre", "Boucle", "Sud"].map((region, index) => (
                      <div
                        key={region}
                        className={`rounded-lg border p-3 text-xs font-bold ${
                          index % 3 === 0
                            ? "border-red-200 bg-red-50 text-red-700"
                            : index % 3 === 1
                              ? "border-amber-200 bg-amber-50 text-amber-700"
                              : "border-green-200 bg-green-50 text-green-700"
                        }`}
                      >
                        {region}
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
                    <span>Mil local</span>
                    <span className="font-bold text-faso-navy">438 FCFA/kg</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-faso-navy">{showcase.catalog}</h3>
                      <p className="text-xs text-gray-500">{showcase.catalogSubtitle}</p>
                    </div>
                    <Database className="h-5 w-5 text-faso-red" />
                  </div>
                  {[
                    ["Prix cereales Burkina", showcase.published],
                    ["Limites administratives", showcase.verified],
                    ["Indicateurs sante", showcase.api],
                  ].map(([name, status]) => (
                    <div key={name} className="flex items-center justify-between border-t border-gray-100 py-2 first:border-t-0">
                      <span className="truncate text-sm font-semibold text-gray-700">{name}</span>
                      <span className="ml-3 rounded-full bg-gray-100 px-2 py-1 text-[11px] font-bold uppercase text-gray-500">
                        {status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
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
