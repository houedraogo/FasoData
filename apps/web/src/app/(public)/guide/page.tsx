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
import { useLanguage } from "@/lib/i18n";

export default function GuidePage() {
  const { t } = useLanguage();

  const AUDIENCES = [
    {
      title: t("guide.audience.academic.title"),
      icon: GraduationCap,
      goal: t("guide.audience.academic.goal"),
      steps: [
        t("guide.audience.academic.step1"),
        t("guide.audience.academic.step2"),
        t("guide.audience.academic.step3"),
        t("guide.audience.academic.step4"),
      ],
    },
    {
      title: t("guide.audience.business.title"),
      icon: Building2,
      goal: t("guide.audience.business.goal"),
      steps: [
        t("guide.audience.business.step1"),
        t("guide.audience.business.step2"),
        t("guide.audience.business.step3"),
        t("guide.audience.business.step4"),
      ],
    },
    {
      title: t("guide.audience.ngo.title"),
      icon: Handshake,
      goal: t("guide.audience.ngo.goal"),
      steps: [
        t("guide.audience.ngo.step1"),
        t("guide.audience.ngo.step2"),
        t("guide.audience.ngo.step3"),
        t("guide.audience.ngo.step4"),
      ],
    },
    {
      title: t("guide.audience.state.title"),
      icon: Landmark,
      goal: t("guide.audience.state.goal"),
      steps: [
        t("guide.audience.state.step1"),
        t("guide.audience.state.step2"),
        t("guide.audience.state.step3"),
        t("guide.audience.state.step4"),
      ],
    },
  ];

  const FLOW = [
    {
      title: t("guide.flow.catalogue.title"),
      icon: Search,
      text: t("guide.flow.catalogue.text"),
      href: "/datasets",
      cta: t("guide.flow.catalogue.cta"),
    },
    {
      title: t("guide.flow.map.title"),
      icon: Map,
      text: t("guide.flow.map.text"),
      href: "/carte",
      cta: t("guide.flow.map.cta"),
    },
    {
      title: t("guide.flow.prices.title"),
      icon: BarChart3,
      text: t("guide.flow.prices.text"),
      href: "/carte-prix",
      cta: t("guide.flow.prices.cta"),
    },
    {
      title: t("guide.flow.publish.title"),
      icon: UploadCloud,
      text: t("guide.flow.publish.text"),
      href: "/auth/inscription",
      cta: t("guide.flow.publish.cta"),
    },
  ];

  const PRIVATE_STEPS = [
    ["1", t("guide.step1.title"), t("guide.step1.text")],
    ["2", t("guide.step2.title"), t("guide.step2.text")],
    ["3", t("guide.step3.title"), t("guide.step3.text")],
    ["4", t("guide.step4.title"), t("guide.step4.text")],
    ["5", t("guide.step5.title"), t("guide.step5.text")],
  ];

  const TRUST_ITEMS = [
    { icon: ShieldCheck, text: t("guide.trust1") },
    { icon: CheckCircle2, text: t("guide.trust2") },
    { icon: Bell, text: t("guide.trust3") },
  ];

  const QUICK_STEPS = [
    t("guide.step.question"),
    t("guide.step.dataset"),
    t("guide.step.map"),
    t("guide.step.analyse"),
    t("guide.step.action"),
  ];

  return (
    <div className="bg-[#F8FAFC]">
      <section className="border-b border-gray-100 bg-[#1A2C42] text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-20">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold ring-1 ring-white/10">
              <BookOpen className="h-4 w-4 text-[#E04E2F]" />
              {t("guide.badge")}
            </div>
            <h1 className="max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">
              {t("guide.title")}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/70">
              {t("guide.description")}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/datasets" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#E04E2F] px-5 py-3 text-sm font-bold text-white">
                {t("guide.startCta")} <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/auth/inscription" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 px-5 py-3 text-sm font-bold text-white hover:bg-white/10">
                {t("guide.createOrg")}
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/8 p-5 shadow-2xl">
            <div className="rounded-xl bg-white p-5 text-gray-900">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400">{t("guide.quickPath")}</p>
                  <h2 className="mt-1 text-xl font-bold">{t("guide.quickPathSubtitle")}</h2>
                </div>
                <Database className="h-7 w-7 text-[#E04E2F]" />
              </div>
              <div className="space-y-3">
                {QUICK_STEPS.map((item, index) => (
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
          <p className="text-sm font-bold uppercase tracking-widest text-[#E04E2F]">{t("guide.forWho")}</p>
          <h2 className="mt-2 text-3xl font-black text-gray-900">{t("guide.chooseYourPath")}</h2>
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
            <p className="text-sm font-bold uppercase tracking-widest text-[#E04E2F]">{t("guide.dashboardBadge")}</p>
            <h2 className="mt-2 text-3xl font-black text-gray-900">{t("guide.dashboardTitle")}</h2>
            <p className="mt-4 text-sm leading-7 text-gray-500">
              {t("guide.dashboardDesc")}
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
              <p className="text-sm font-bold uppercase tracking-widest text-[#FCA5A5]">{t("guide.trustBadge")}</p>
              <h2 className="mt-2 text-2xl font-black">{t("guide.trustTitle")}</h2>
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
