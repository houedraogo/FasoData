"use client";

import { useState } from "react";
import { CheckCircle, AlertTriangle, RefreshCw, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const PROBLEMS = [
  { row: 47,  col: "date_enr",    value: "2026-03-12", issue: "Date dans le futur",          suggestion: null,          action: "Corriger" },
  { row: 102, col: "id_enq",      value: "EQ-2025-001",issue: "Doublon (ligne 23)",           suggestion: null,          action: "Corriger" },
  { row: 134, col: "commune",     value: "Wagadougou",  issue: "Commune non reconnue",         suggestion: "Ouagadougou", action: "Appliquer" },
  { row: 256, col: "temp_c",      value: "43.8",        issue: "Valeur aberrante (> 42°C)",   suggestion: null,          action: "Corriger" },
  { row: 312, col: "commune",     value: "Bobo-D",      issue: "Forme abrégée",               suggestion: "Bobo-Dioulasso", action: "Appliquer" },
  { row: 418, col: "observation", value: "Ø",           issue: "Manquant",                    suggestion: null,          action: "Corriger" },
  { row: 502, col: "sexe",        value: "X",           issue: "Valeur hors énumération (M/F)",suggestion: null,         action: "Corriger" },
  { row: 671, col: "id_enq",      value: "EQ-2025-038", issue: "Doublon (ligne 244)",         suggestion: null,          action: "Corriger" },
  { row: 805, col: "temp_c",      value: "34.1",        issue: "Sous le seuil normal",        suggestion: null,          action: "Corriger" },
  { row: 901, col: "date_enr",    value: "14/01/2025",  issue: "Format date non standard",    suggestion: "2025-01-14",  action: "Appliquer" },
];

const ISSUES_SUMMARY = [
  { label: "Doublons sur ID",           count: 12, severity: "warning" },
  { label: "Dates dans le futur",       count: 3,  severity: "warning" },
  { label: "Valeurs aberrantes (temp.)",count: 8,  severity: "warning" },
  { label: "Commune non reconnue",      count: 6,  severity: "info" },
  { label: "Valeurs manquantes (obs.)", count: 18, severity: "info" },
];

const HISTORY = [
  { user: "AS", name: "Adama S.",      action: "Import du fichier source",          time: "il y a 1h" },
  { user: "SY", name: "Système",       action: "Contrôles automatiques exécutés",   time: "il y a 58 min" },
  { user: "AS", name: "Adama S.",      action: "Mappage des colonnes appliqué",     time: "il y a 32 min" },
  { user: "AS", name: "Adama S.",      action: "Correction lots de doublons (5)",   time: "il y a 14 min" },
  { user: "ST", name: "Sory T.",       action: "Revue commencée",                   time: "il y a 4 min" },
];

export default function ValidationPage() {
  const [applied, setApplied] = useState<Set<number>>(new Set());

  const scoreColor = "#D97706"; // 83 = Acceptable
  const circ = 2 * Math.PI * 36;

  return (
    <div className="p-6 lg:p-8 space-y-6">

      {/* En-tête */}
      <div>
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-full">
            En validation
          </span>
          <span className="text-xs text-gray-500">
            Réviseur : Dr. Sory Traoé
          </span>
        </div>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <h1 className="text-2xl font-bold text-gray-900">Nettoyage & contrôle qualité</h1>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium bg-white hover:bg-gray-50">
              <RefreshCw className="w-4 h-4" /> Relancer les contrôles
            </button>
            <button className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium bg-white hover:bg-gray-50">
              Renvoyer pour révision
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-[#16A34A] hover:bg-green-700 text-white rounded-xl text-sm font-semibold">
              <CheckCircle className="w-4 h-4" /> Valider & publier
            </button>
          </div>
        </div>
      </div>

      {/* Score qualité */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 items-center">
          {/* Score circulaire */}
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20 shrink-0">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="36" fill="none" stroke="#F3F4F6" strokeWidth="6" />
                <circle cx="40" cy="40" r="36" fill="none" stroke={scoreColor} strokeWidth="6"
                  strokeDasharray={circ} strokeDashoffset={circ * (1 - 83 / 100)}
                  strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold text-gray-900">83</span>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">Score qualité</p>
              <p className="text-lg font-bold text-[#D97706]">Acceptable</p>
              <p className="text-xs text-gray-400">Cible : ≥ 90 — 4 corrections suggérées</p>
            </div>
          </div>

          {/* Métriques */}
          {[
            { label: "Complétude",  value: "94%",  sub: "0.3% valeurs manquantes", color: "#16A34A" },
            { label: "Cohérence",   value: "89%",  sub: "17 incohérences",          color: "#D97706" },
            { label: "Doublons",    value: "12",   sub: "détectés sur ID",          color: "#E04E2F" },
          ].map(({ label, value, sub, color }) => (
            <div key={label}>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
              <p className="text-3xl font-bold" style={{ color }}>{value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tableau + Problèmes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Aperçu lignes problématiques */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <span className="w-1 h-4 bg-[#E04E2F] rounded-full" />
            <h2 className="font-bold text-gray-900 text-sm">Aperçu des lignes problématiques</h2>
            <span className="text-xs text-gray-400">2 847 lignes · 47 marquées</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  {["Ligne", "Colonne", "Valeur", "Problème", "Suggestion", "Action"].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {PROBLEMS.map((p, i) => (
                  <tr key={i} className="hover:bg-gray-50/60">
                    <td className="px-4 py-2.5 text-gray-400 font-mono text-xs">{p.row}</td>
                    <td className="px-4 py-2.5 text-gray-500 font-mono text-xs">{p.col}</td>
                    <td className="px-4 py-2.5 font-semibold text-gray-800 text-xs">{p.value}</td>
                    <td className="px-4 py-2.5 text-gray-600 text-xs">{p.issue}</td>
                    <td className="px-4 py-2.5 text-xs font-semibold text-[#16A34A]">
                      {p.suggestion ?? "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      {applied.has(i) ? (
                        <span className="text-xs text-[#16A34A] font-semibold flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Appliqué
                        </span>
                      ) : (
                        <button
                          onClick={() => p.action === "Appliquer" && setApplied((prev) => new Set([...prev, i]))}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors",
                            p.action === "Appliquer"
                              ? "bg-[#16A34A] text-white hover:bg-green-700"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          )}>
                          {p.action}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Problèmes + Historique */}
        <div className="space-y-4">
          {/* Problèmes détectés */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-1 h-4 bg-[#E04E2F] rounded-full" />
              <h2 className="font-bold text-gray-900 text-sm">Problèmes détectés</h2>
              <span className="text-xs text-gray-400">Par sévérité</span>
            </div>
            <div className="space-y-2.5">
              {ISSUES_SUMMARY.map((issue) => (
                <div key={issue.label} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={cn("w-3.5 h-3.5 shrink-0",
                      issue.severity === "warning" ? "text-[#D97706]" : "text-[#2563EB]")} />
                    <span className="text-xs text-gray-700">{issue.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-800">×{issue.count}</span>
                    <button className="text-xs text-[#E04E2F] hover:underline font-medium">Corriger →</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Historique */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-1 h-4 bg-[#16A34A] rounded-full" />
              <h2 className="font-bold text-gray-900 text-sm">Historique des actions</h2>
            </div>
            <div className="space-y-3">
              {HISTORY.map((h, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0",
                    h.user === "SY" ? "bg-gray-400" : h.user === "ST" ? "bg-[#0EA5E9]" : "bg-[#475569]")}>
                    {h.user}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-800">{h.name} · {h.action}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{h.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
