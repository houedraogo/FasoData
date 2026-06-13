"use client";

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  CheckCircle2,
  Database,
  GraduationCap,
  Handshake,
  Landmark,
  Map,
  Search,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";

const AUDIENCES = [
  {
    title: "Etudiants, universites et chercheurs",
    icon: GraduationCap,
    goal: "Trouver des donnees fiables pour memoires, theses, articles et travaux de recherche.",
    steps: ["Chercher un dataset", "Verifier la source", "Telecharger ou citer", "Comparer dans le temps"],
  },
  {
    title: "Entreprises",
    icon: Building2,
    goal: "Preparer une etude de marche avec des indicateurs territoriaux et sectoriels.",
    steps: ["Explorer un secteur", "Comparer les regions", "Analyser les prix", "Exporter les donnees"],
  },
  {
    title: "ONG",
    icon: Handshake,
    goal: "Suivre des indicateurs d'impact, des prix alimentaires et des alertes terrain.",
    steps: ["Configurer les preferences", "Creer un programme", "Suivre les KPIs", "Exporter un rapport"],
  },
  {
    title: "Etat et institutions publiques",
    icon: Landmark,
    goal: "Disposer d'une lecture claire des tendances pour soutenir la decision publique.",
    steps: ["Observer les indicateurs", "Suivre les alertes", "Valider les donnees", "Publier au catalogue"],
  },
];

const FLOW = [
  {
    title: "Explorer le catalogue",
    icon: Search,
    text: "Utilisez les filtres par secteur, region, source et type de donnee pour trouver rapidement un jeu de donnees.",
    href: "/datasets",
    cta: "Voir les datasets",
  },
  {
    title: "Visualiser sur carte",
    icon: Map,
    text: "Passez d'une liste de donnees a une lecture geographique : regions, indicateurs, couches et details territoriaux.",
    href: "/carte",
    cta: "Ouvrir la carte",
  },
  {
    title: "Analyser les prix",
    icon: BarChart3,
    text: "Consultez les prix alimentaires issus de sources publiques WFP/HDX et de releves terrain FasoData.",
    href: "/carte-prix",
    cta: "Voir les prix",
  },
  {
    title: "Publier et suivre",
    icon: UploadCloud,
    text: "Les organisations peuvent importer leurs datasets, les controler, puis les publier apres validation.",
    href: "/auth/inscription",
    cta: "Creer un compte",
  },
];

const PRIVATE_STEPS = [
  ["1", "Onboarding", "Choisissez vos domaines, regions et types de donnees pour personnaliser le dashboard."],
  ["2", "Dashboard", "Suivez les KPIs recommandes, les alertes actives, les cartes et les datasets recents."],
  ["3", "Programmes", "Creez un programme pour suivre des indicateurs propres a une intervention ou une zone."],
  ["4", "Validation", "Controlez la qualite des donnees, corrigez les erreurs et preparez la publication."],
  ["5", "Rapports", "Exportez des rapports et livrables depuis les donnees verifiees."],
];

const TRUST_ITEMS = [
  { icon: ShieldCheck, text: "Origine des donnees affichee : public, terrain, upload utilisateur ou seed interne." },
  { icon: CheckCircle2, text: "Les donnees de demonstration sont masquees en production quand elles ne sont pas verifiees." },
  { icon: Bell, text: "Les alertes peuvent notifier par email, SMS ou WhatsApp selon les services actives." },
];

export default function GuidePage() {
  return (
    <div className="bg-[#F8FAFC]">
      <section className="border-b border-gray-100 bg-[#1A2C42] text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-20">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold ring-1 ring-white/10">
              <BookOpen className="h-4 w-4 text-[#E04E2F]" />
              Guide d'utilisation FasoData
            </div>
            <h1 className="max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">
              Comprendre, explorer et utiliser les donnees en quelques etapes.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/70">
              Ce tutoriel explique comment chaque profil peut utiliser FasoData : recherche academique,
              analyse de marche, suivi d'impact, prix alimentaires et decision publique.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/datasets" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#E04E2F] px-5 py-3 text-sm font-bold text-white">
                Commencer par le catalogue <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/auth/inscription" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 px-5 py-3 text-sm font-bold text-white hover:bg-white/10">
                Creer un espace organisation
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/8 p-5 shadow-2xl">
            <div className="rounded-xl bg-white p-5 text-gray-900">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Parcours rapide</p>
                  <h2 className="mt-1 text-xl font-bold">De la question a la decision</h2>
                </div>
                <Database className="h-7 w-7 text-[#E04E2F]" />
              </div>
              <div className="space-y-3">
                {["Question", "Dataset", "Carte", "Analyse", "Action"].map((item, index) => (
                  <div key={item} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1A2C42] text-xs font-bold text-white">
                      {index + 1}
                    </span>
                    <span className="text-sm font-semibold text-gray-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-7">
          <p className="text-sm font-bold uppercase tracking-widest text-[#E04E2F]">Pour qui ?</p>
          <h2 className="mt-2 text-3xl font-black text-gray-900">Choisissez votre parcours</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {AUDIENCES.map(({ title, icon: Icon, goal, steps }) => (
            <article key={title} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <Icon className="h-7 w-7 text-[#E04E2F]" />
              <h3 className="mt-4 text-lg font-bold text-gray-900">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-gray-500">{goal}</p>
              <ul className="mt-4 space-y-2">
                {steps.map((step) => (
                  <li key={step} className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <CheckCircle2 className="h-4 w-4 text-[#16A34A]" />
                    {step}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-4">
          {FLOW.map(({ title, icon: Icon, text, href, cta }) => (
            <article key={title} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <Icon className="h-6 w-6 text-[#E04E2F]" />
              <h3 className="mt-4 text-lg font-bold text-gray-900">{title}</h3>
              <p className="mt-2 min-h-[96px] text-sm leading-6 text-gray-500">{text}</p>
              <Link href={href} className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#E04E2F]">
                {cta} <ArrowRight className="h-4 w-4" />
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-gray-100 bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-[#E04E2F]">Espace organisation</p>
            <h2 className="mt-2 text-3xl font-black text-gray-900">Comment fonctionne le dashboard ?</h2>
            <p className="mt-4 text-sm leading-7 text-gray-500">
              Apres connexion, FasoData adapte l'espace de travail aux preferences de l'utilisateur.
              Le dashboard affiche d'abord les donnees recommandees, puis ajoute les statistiques des programmes crees.
            </p>
          </div>
          <div className="space-y-3">
            {PRIVATE_STEPS.map(([number, title, text]) => (
              <div key={number} className="flex gap-4 rounded-2xl border border-gray-100 bg-[#F8FAFC] p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E04E2F] text-sm font-bold text-white">
                  {number}
                </span>
                <div>
                  <h3 className="font-bold text-gray-900">{title}</h3>
                  <p className="mt-1 text-sm leading-6 text-gray-500">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-[#1A2C42] p-6 text-white lg:p-8">
          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-[#FCA5A5]">Fiabilite</p>
              <h2 className="mt-2 text-2xl font-black">Comment savoir si une donnee est fiable ?</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {TRUST_ITEMS.map(({ icon: Icon, text }) => (
                <div key={text} className="rounded-xl bg-white/10 p-4 ring-1 ring-white/10">
                  <Icon className="h-5 w-5 text-[#E04E2F]" />
                  <p className="mt-3 text-sm leading-6 text-white/75">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
