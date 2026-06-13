"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Database, Globe, Shield, Users, BarChart3,
  Mail, Github, ExternalLink, CheckCircle, ArrowRight,
  GraduationCap, Building2, Landmark,
} from "lucide-react";

interface PublicStats { datasets: number; categories: number; downloads: number; price_observations: number; }
function fmt(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k+`;
  return n > 0 ? `${n}` : "—";
}

const VALEURS = [
  {
    icon: Globe,
    title: "Transparence",
    desc: "Toutes les données sont accessibles librement, avec leur source et leur méthodologie documentées.",
  },
  {
    icon: Shield,
    title: "Fiabilité",
    desc: "Les données sont vérifiées et validées par nos équipes avant publication sur la plateforme.",
  },
  {
    icon: Users,
    title: "Inclusivité",
    desc: "La plateforme est conçue pour tous : chercheurs, journalistes, citoyens, décideurs publics.",
  },
  {
    icon: CheckCircle,
    title: "Open Source",
    desc: "Le code de FasoData est ouvert et disponible sur GitHub pour toute réutilisation et amélioration.",
  },
];

const STACK = [
  { name: "Next.js 15", role: "Frontend", color: "bg-gray-900 text-white" },
  { name: "FastAPI",    role: "Backend",  color: "bg-green-600 text-white" },
  { name: "PostgreSQL", role: "Base de données", color: "bg-blue-700 text-white" },
  { name: "MinIO",      role: "Stockage fichiers", color: "bg-red-600 text-white" },
  { name: "Meilisearch",role: "Recherche", color: "bg-purple-600 text-white" },
  { name: "Docker",     role: "Infra",    color: "bg-sky-600 text-white" },
];

const CATEGORIES = [
  "Agriculture & Élevage", "Santé publique", "Éducation",
  "Économie & Finances", "Environnement", "Géographie & Démographie",
  "Infrastructure", "Sécurité alimentaire", "Gouvernance",
  "Culture & Patrimoine", "Eau & Assainissement", "Énergie",
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AProposPage() {
  const [publicStats, setPublicStats] = useState<PublicStats | null>(null);

  useEffect(() => {
    fetch("/api/datasets/public-stats")
      .then((r) => r.json())
      .then(setPublicStats)
      .catch(() => {});
  }, []);

  const STATS = [
    { value: publicStats ? fmt(publicStats.datasets) : "…", label: "Datasets disponibles", icon: Database },
    { value: publicStats ? `${publicStats.categories}` : "…", label: "Catégories thématiques", icon: BarChart3 },
    { value: publicStats ? fmt(publicStats.price_observations) : "…", label: "Relevés de prix", icon: Users },
    { value: "100%", label: "Open source", icon: Globe },
  ];

  return (
    <div className="min-h-screen bg-white">

      {/* Navbar simple */}
      <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-faso-navy text-lg">
            <div className="w-8 h-8 bg-faso-navy rounded-lg flex items-center justify-center">
              <Database className="w-4 h-4 text-white" />
            </div>
            Faso<span className="font-light">Data</span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/datasets" className="text-gray-500 hover:text-faso-navy transition-colors">Datasets</Link>
            <Link href="/auth/connexion" className="btn-primary text-sm py-2 px-4">Connexion</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-faso-navy relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-faso-red/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-faso-gold/15 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-24 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 text-white/80 text-xs px-4 py-2 rounded-full mb-8 border border-white/20">
            <Globe className="w-3.5 h-3.5" />
            Plateforme nationale d'open data
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
            À propos de <span className="text-faso-gold">FasoData</span>
          </h1>
          <p className="text-white/70 text-lg max-w-2xl mx-auto leading-relaxed">
            FasoData est la plateforme de référence pour les données ouvertes du Burkina Faso.
            Notre mission : rendre l'information publique accessible à tous pour soutenir
            la recherche, la transparence et le développement.
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
              <h2 className="text-3xl font-bold text-faso-navy mb-6">Notre mission</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                FasoData a été créé pour combler le manque d'accès aux données structurées
                sur le Burkina Faso. Trop souvent, les informations essentielles — sur la santé,
                l'agriculture, l'éducation ou l'économie — restent éparpillées ou inaccessibles.
              </p>
              <p className="text-gray-600 leading-relaxed mb-6">
                En centralisant et en ouvrant ces données, nous permettons aux chercheurs,
                journalistes, ONG, entrepreneurs et citoyens de prendre des décisions
                éclairées et de contribuer au développement du pays.
              </p>
              <Link href="/datasets" className="btn-primary inline-flex">
                Explorer les données
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {VALEURS.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="bg-gray-50 rounded-2xl p-5">
                  <div className="w-9 h-9 bg-faso-navy/10 rounded-lg flex items-center justify-center mb-3">
                    <Icon className="w-4 h-4 text-faso-navy" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1.5 text-sm">{title}</h3>
                  <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-gray-50 border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mb-10">
            <h2 className="text-3xl font-bold text-faso-navy mb-3">À qui s'adresse FasoData ?</h2>
            <p className="text-gray-600 leading-relaxed">
              FasoData est construit pour quatre grandes familles d'utilisateurs qui ont besoin
              de données fiables pour chercher, analyser, piloter ou décider.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              {
                icon: GraduationCap,
                title: "Étudiants, universités et chercheurs",
                desc: "Accéder à des données fiables pour conduire des recherches académiques, produire des analyses citées et comparer les territoires dans le temps.",
              },
              {
                icon: Building2,
                title: "Entreprises",
                desc: "Mieux comprendre un secteur, évaluer une zone, suivre les tendances et préparer des études de marché fondées sur des données exploitables.",
              },
              {
                icon: Users,
                title: "ONG",
                desc: "Suivre des indicateurs d'impact, documenter les programmes, surveiller les prix et adapter les interventions aux réalités du terrain.",
              },
              {
                icon: Landmark,
                title: "État et institutions publiques",
                desc: "Observer les indicateurs clés, notamment les prix des produits, pour orienter les politiques publiques et prendre des décisions éclairées.",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="w-11 h-11 bg-faso-navy/10 rounded-xl flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-faso-navy" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Catégories */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl font-bold text-faso-navy mb-3">12 domaines couverts</h2>
          <p className="text-gray-500 text-sm mb-10">
            De l'agriculture à la gouvernance, FasoData couvre tous les secteurs clés du développement.
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
            <h2 className="text-2xl font-bold text-faso-navy mb-2">Stack technique</h2>
            <p className="text-gray-500 text-sm">
              FasoData est construit sur des technologies modernes, open source et éprouvées.
            </p>
          </div>
          <div className="flex flex-wrap gap-4 justify-center">
            {STACK.map(({ name, role, color }) => (
              <div key={name} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-5 py-3 shadow-sm">
                <span className={`text-xs font-bold px-2 py-1 rounded-lg ${color}`}>{name}</span>
                <span className="text-sm text-gray-500">{role}</span>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-faso-navy transition-colors"
            >
              <Github className="w-4 h-4" />
              Code source disponible sur GitHub
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
          <h2 className="text-3xl font-bold text-white mb-4">Contribuer à FasoData</h2>
          <p className="text-white/70 mb-8 leading-relaxed">
            Vous êtes une institution, une ONG ou une organisation publique ?
            Partagez vos données et contribuez à construire une base de connaissance commune sur le Burkina Faso.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/inscription" className="btn-primary bg-faso-red hover:bg-faso-red/90 justify-center">
              Créer un compte institutionnel
            </Link>
            <a
              href="mailto:contact@fasodata.bf"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-white/20 text-white hover:bg-white/10 transition-colors text-sm font-medium"
            >
              <Mail className="w-4 h-4" />
              contact@fasodata.bf
            </a>
          </div>
        </div>
      </section>

      {/* Footer minimal */}
      <footer className="py-6 border-t border-gray-100 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} FasoData — Plateforme de données ouvertes du Burkina Faso
        <span className="mx-2">·</span>
        <Link href="/datasets" className="hover:text-faso-navy transition-colors">Datasets</Link>
        <span className="mx-2">·</span>
        <Link href="/carte" className="hover:text-faso-navy transition-colors">Carte</Link>
      </footer>
    </div>
  );
}
