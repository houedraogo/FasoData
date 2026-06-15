"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, BarChart3, Building2, Database, Download, Globe, GraduationCap, Landmark, Map, Search, Shield, Users } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import PrixDuJourWidget from "@/components/home/PrixDuJourWidget";
import { useLanguage } from "@/lib/i18n";

interface PublicStats { datasets: number; categories: number; downloads: number; price_observations: number; organizations: number; }

function fmt(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k+`;
  return n > 0 ? `${n}` : "—";
}

const categoryMeta = [
  { fr: "Agriculture", en: "Agriculture", icon: "A", color: "bg-green-50 text-green-700 border-green-200" },
  { fr: "Sante", en: "Health", icon: "S", color: "bg-red-50 text-red-700 border-red-200" },
  { fr: "Education", en: "Education", icon: "E", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { fr: "Economie", en: "Economy", icon: "Eco", color: "bg-purple-50 text-purple-700 border-purple-200" },
  { fr: "Geographie", en: "Geography", icon: "G", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  { fr: "Environnement", en: "Environment", icon: "Env", color: "bg-teal-50 text-teal-700 border-teal-200" },
];

function ContributeurForm() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const nom     = String(fd.get("nom") ?? "").trim();
    const email   = String(fd.get("email") ?? "").trim();
    const region  = String(fd.get("region") ?? "").trim();
    const marche  = String(fd.get("marche") ?? "").trim();
    const message = String(fd.get("message") ?? "").trim();

    const body = [
      `Nom : ${nom}`,
      `Email : ${email}`,
      `Région : ${region}`,
      `Marché : ${marche}`,
      message ? `\nMessage :\n${message}` : "",
    ].join("\n");

    setLoading(true);
    setTimeout(() => {
      window.location.href = `mailto:contact@fasodata.com?subject=${encodeURIComponent("Candidature contributeur terrain — " + nom)}&body=${encodeURIComponent(body)}`;
      setSubmitted(true);
      setLoading(false);
    }, 300);
  };

  if (submitted) {
    return (
      <div className="bg-white rounded-2xl border border-green-100 shadow-sm p-10 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <span className="text-3xl">✅</span>
        </div>
        <h3 className="text-xl font-bold text-faso-navy mb-2">Votre candidature est prête !</h3>
        <p className="text-gray-500 text-sm">
          Votre client email s'est ouvert avec les informations pré-remplies.<br />
          Envoyez l'email pour finaliser votre candidature.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7 space-y-4">
      <h3 className="text-lg font-bold text-faso-navy mb-1">Formulaire de candidature</h3>
      <p className="text-sm text-gray-500 mb-4">Remplissez ce formulaire — nous vous contacterons sous 48h.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Nom complet *</label>
          <input name="nom" type="text" required placeholder="Aïcha Sawadogo"
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-faso-navy/20" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Email *</label>
          <input name="email" type="email" required placeholder="vous@example.com"
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-faso-navy/20" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Région *</label>
        <select name="region" required
          className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-faso-navy/20 bg-white">
          <option value="">Sélectionnez votre région</option>
          {["Boucle du Mouhoun","Cascades","Centre","Centre-Est","Centre-Nord","Centre-Ouest","Centre-Sud","Est","Hauts-Bassins","Nord","Plateau-Central","Sahel","Sud-Ouest"].map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Marché concerné *</label>
        <input name="marche" type="text" required placeholder="Ex : Marché central de Bobo-Dioulasso"
          className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-faso-navy/20" />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Message (optionnel)</label>
        <textarea name="message" rows={3} placeholder="Parlez-nous de votre expérience ou motivation..."
          className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-faso-navy/20 resize-none" />
      </div>

      <button type="submit" disabled={loading}
        className="w-full py-3 bg-[#E04E2F] hover:bg-[#c73e22] text-white font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
        {loading ? "Préparation…" : "Envoyer ma candidature →"}
      </button>
      <p className="text-xs text-gray-400 text-center">
        Votre client email s'ouvrira pour l'envoi final.
      </p>
    </form>
  );
}

export default function HomePage() {
  const { locale, t } = useLanguage();
  const [publicStats, setPublicStats] = useState<PublicStats | null>(null);

  useEffect(() => {
    fetch("/api/datasets/public-stats")
      .then((r) => r.json())
      .then(setPublicStats)
      .catch(() => {});
  }, []);

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
    { value: publicStats ? fmt(publicStats.datasets) : "—",      label: t("home.stats.datasets") },
    { value: publicStats ? `${publicStats.categories}` : "—",    label: t("home.stats.categories") },
    { value: publicStats ? fmt(publicStats.organizations) : "—", label: t("home.stats.partners") },
    { value: publicStats ? fmt(publicStats.downloads) : "—",     label: t("home.stats.downloads") },
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
                    <p className="text-white font-bold text-xl leading-none">{publicStats ? fmt(publicStats.datasets) : "—"}</p>
                    <p className="text-white/50 text-xs mt-0.5">{t("home.stats.datasets")}</p>
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center shrink-0">
                    <BarChart3 className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-xl leading-none">{publicStats ? fmt(publicStats.organizations) : "—"}</p>
                    <p className="text-white/50 text-xs mt-0.5">{t("home.stats.partners")}</p>
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
                      [publicStats ? fmt(publicStats.datasets) : "—",      t("home.stats.datasets")],
                      [publicStats ? fmt(publicStats.organizations) : "—", t("home.stats.partners")],
                      [publicStats ? fmt(publicStats.price_observations) : "—", locale === "fr" ? "Relevés prix" : "Price data"],
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

      {/* ── Origine des données ── */}
      <section className="py-20 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* En-tête */}
          <div className="text-center mb-14">
            <span className="inline-block px-4 py-1.5 bg-[#E04E2F]/10 text-[#E04E2F] text-sm font-bold rounded-full mb-4 uppercase tracking-wider">
              Données de terrain
            </span>
            <h2 className="text-3xl lg:text-4xl font-bold text-faso-navy mb-4">
              Des marchés locaux à votre écran
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto leading-relaxed">
              Chaque prix affiché sur FasoData commence par un contributeur qui se rend
              physiquement au marché. Les données ouvertes viennent en complément — jamais
              en remplacement.
            </p>
          </div>

          {/* Pipeline horizontal */}
          <div className="relative">
            {/* Ligne de connexion (desktop) */}
            <div className="hidden lg:block absolute top-[52px] left-[calc(12.5%+24px)] right-[calc(12.5%+24px)] h-0.5 bg-gradient-to-r from-[#E04E2F]/20 via-[#E04E2F]/60 to-green-500/40" />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-4">

              {/* Étape 1 — Terrain */}
              <div className="relative flex flex-col items-center text-center">
                <div className="relative z-10 w-[52px] h-[52px] rounded-2xl bg-[#E04E2F] flex items-center justify-center shadow-lg shadow-[#E04E2F]/30 mb-5">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 w-full">
                  <p className="text-xs font-bold text-[#E04E2F] uppercase tracking-widest mb-2">Étape 1</p>
                  <h3 className="font-bold text-faso-navy mb-3">Collecte terrain</h3>
                  <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                    Un contributeur se rend au marché et relève les prix produit par produit.
                  </p>
                  {/* Mini table prix */}
                  <div className="bg-white border border-gray-100 rounded-xl overflow-hidden text-left">
                    <div className="px-3 py-2 bg-[#1A2C42] flex justify-between">
                      <span className="text-[10px] font-bold text-white/60 uppercase">Produit</span>
                      <span className="text-[10px] font-bold text-white/60 uppercase">Prix/kg</span>
                    </div>
                    {[
                      ["Riz local",  "650 FCFA"],
                      ["Maïs blanc", "300 FCFA"],
                      ["Mil",        "400 FCFA"],
                      ["Sorgho",     "350 FCFA"],
                    ].map(([p, v]) => (
                      <div key={p} className="px-3 py-1.5 flex justify-between border-t border-gray-50">
                        <span className="text-xs text-gray-600">{p}</span>
                        <span className="text-xs font-bold text-faso-navy">{v}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 mt-3 text-[11px] text-gray-400">
                    <span>📷 Photo</span>
                    <span>·</span>
                    <span>📍 GPS</span>
                    <span>·</span>
                    <span>💬 Commentaire</span>
                  </div>
                </div>
              </div>

              {/* Étape 2 — Contrôle automatique */}
              <div className="relative flex flex-col items-center text-center">
                <div className="relative z-10 w-[52px] h-[52px] rounded-2xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/30 mb-5">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
                  </svg>
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 w-full h-full">
                  <p className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-2">Étape 2</p>
                  <h3 className="font-bold text-faso-navy mb-3">Contrôle automatique</h3>
                  <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                    L'algorithme détecte les anomalies avant toute publication.
                  </p>
                  <div className="space-y-2 text-left">
                    {[
                      ["Valeurs aberrantes",    true],
                      ["Erreurs de saisie",     true],
                      ["Données incomplètes",   true],
                      ["Cohérence géographique",true],
                    ].map(([label, ok]) => (
                      <div key={label as string} className="flex items-center gap-2.5 bg-white border border-gray-100 rounded-lg px-3 py-2">
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${ok ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
                          {ok ? "✓" : "✗"}
                        </span>
                        <span className="text-xs text-gray-600">{label as string}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Étape 3 — Vérification croisée */}
              <div className="relative flex flex-col items-center text-center">
                <div className="relative z-10 w-[52px] h-[52px] rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30 mb-5">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 w-full h-full">
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">Étape 3</p>
                  <h3 className="font-bold text-faso-navy mb-3">Double vérification</h3>
                  <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                    Un second contributeur indépendant relève les mêmes prix sur le même marché.
                  </p>
                  <div className="bg-white border border-gray-100 rounded-xl p-3 text-left space-y-3">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Score de confiance</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: "82%" }} />
                        </div>
                        <span className="text-sm font-bold text-blue-600">82%</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Recoupement données ouvertes</p>
                      <div className="flex gap-1.5 flex-wrap">
                        {["WFP/HDX", "SONAGESS", "INSD"].map((src) => (
                          <span key={src} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-semibold rounded-full border border-blue-100">{src}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Étape 4 — Publication */}
              <div className="relative flex flex-col items-center text-center">
                <div className="relative z-10 w-[52px] h-[52px] rounded-2xl bg-green-600 flex items-center justify-center shadow-lg shadow-green-600/30 mb-5">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="bg-green-50 border border-green-100 rounded-2xl p-5 w-full h-full">
                  <p className="text-xs font-bold text-green-600 uppercase tracking-widest mb-2">Étape 4</p>
                  <h3 className="font-bold text-faso-navy mb-3">Intégration FasoData</h3>
                  <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                    La donnée validée rejoint la base et devient accessible via le catalogue, la carte et l'API.
                  </p>
                  <div className="space-y-2 text-left">
                    {[
                      ["Catalogue public",   "/datasets"],
                      ["Carte des prix",     "/carte-prix"],
                      ["API ouverte",        "/developers"],
                    ].map(([label, href]) => (
                      <Link key={href as string} href={href as string}
                        className="flex items-center justify-between bg-white border border-green-100 rounded-lg px-3 py-2 hover:border-green-300 transition-colors group">
                        <span className="text-xs font-medium text-gray-700">{label as string}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-green-500 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Note de bas de section */}
          <p className="text-center text-xs text-gray-400 mt-10">
            Les données ouvertes (WFP, SONAGESS, INSD, Ministères) complètent les relevés terrain — elles ne les remplacent pas.
          </p>

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
            {categoryMeta.map(({ fr, en, icon, color }) => {
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

      {/* ── Formulaire contributeur terrain ── */}
      <section className="py-20 bg-faso-navy/5 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">

            {/* Texte gauche */}
            <div>
              <span className="inline-block px-4 py-1.5 bg-[#E04E2F]/10 text-[#E04E2F] text-sm font-bold rounded-full mb-5 uppercase tracking-wider">
                Devenir contributeur
              </span>
              <h2 className="text-3xl lg:text-4xl font-bold text-faso-navy mb-5 leading-tight">
                Vous connaissez un marché local ?<br />
                <span className="text-[#E04E2F]">Rejoignez le réseau terrain.</span>
              </h2>
              <p className="text-gray-600 leading-relaxed mb-6">
                Les contributeurs FasoData relèvent les prix dans les marchés de leur région,
                prennent des photos et transmettent leurs données via l'application mobile.
                Chaque relevé, une fois validé, alimente la carte nationale et le catalogue ouvert.
              </p>
              <div className="space-y-3">
                {[
                  ["📍", "Vous vous rendez au marché de votre zone"],
                  ["📝", "Vous saisissez les prix sur l'application (ou sur papier)"],
                  ["✅", "Vos données sont vérifiées et publiées sous 24h"],
                  ["🎖️", "Vous gagnez un score de fiabilité et une reconnaissance publique"],
                ].map(([emoji, text]) => (
                  <div key={text as string} className="flex items-start gap-3">
                    <span className="text-lg leading-tight mt-0.5">{emoji as string}</span>
                    <p className="text-sm text-gray-600 leading-relaxed">{text as string}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Formulaire droite */}
            <ContributeurForm />
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
