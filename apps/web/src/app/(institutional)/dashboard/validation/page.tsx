"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle, AlertTriangle, RefreshCw, ClipboardCheck,
  ChevronDown, ChevronUp, Loader2, Send, RotateCcw, X,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { FocusTrap } from "@/components/ui/FocusTrap";
import toast from "react-hot-toast";

// ── Types ─────────────────────────────────────────────────────────────────────

type IssueSeverity = "low" | "medium" | "high" | "critical";
type CheckStatus   = "pending" | "running" | "completed" | "failed";

interface QualityIssue {
  id: string;
  check_id: string;
  line_number: number | null;
  column_name: string | null;
  raw_value: string | null;
  problem: string;
  suggestion: string | null;
  severity: IssueSeverity;
  is_resolved: boolean;
  created_at: string;
}

interface QualityCheck {
  id: string;
  dataset_id: string | null;
  dataset_slug: string | null;
  status: CheckStatus;
  score: number;
  completeness: number;
  coherence: number;
  duplicate_count: number;
  flagged_rows: number;
  total_rows: number;
  reviewer_id: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  issues: QualityIssue[];
}

// ── Config visuelle ───────────────────────────────────────────────────────────

const SEV_CFG: Record<IssueSeverity, { color: string; bg: string; label: string }> = {
  critical: { color: "text-[#E04E2F]", bg: "bg-red-50",    label: "Critique" },
  high:     { color: "text-[#D97706]", bg: "bg-amber-50",  label: "Élevée" },
  medium:   { color: "text-[#2563EB]", bg: "bg-blue-50",   label: "Moyenne" },
  low:      { color: "text-gray-500",  bg: "bg-gray-50",   label: "Faible" },
};

function scoreColor(s: number): string {
  if (s >= 90) return "#16A34A";
  if (s >= 75) return "#D97706";
  return "#E04E2F";
}
function scoreLabel(s: number): string {
  if (s >= 90) return "Excellent";
  if (s >= 75) return "Acceptable";
  return "À revoir";
}

// ── Composant issue row ───────────────────────────────────────────────────────

function IssueRow({
  issue, onApply, onResolve, resolving,
}: {
  issue: QualityIssue;
  onApply: (id: string) => void;
  onResolve: (id: string) => void;
  resolving: string | null;
}) {
  const cfg = SEV_CFG[issue.severity];
  const busy = resolving === issue.id;

  if (issue.is_resolved) {
    return (
      <tr className="bg-green-50/30">
        <td className="px-4 py-2.5 text-gray-300 font-mono text-xs">{issue.line_number ?? "—"}</td>
        <td className="px-4 py-2.5 text-gray-300 font-mono text-xs">{issue.column_name ?? "—"}</td>
        <td className="px-4 py-2.5 text-gray-300 text-xs line-through">{issue.raw_value ?? "—"}</td>
        <td className="px-4 py-2.5 text-gray-400 text-xs">{issue.problem}</td>
        <td className="px-4 py-2.5 text-xs text-[#16A34A] font-semibold">{issue.suggestion ?? "—"}</td>
        <td className="px-4 py-2.5">
          <span className="text-xs text-[#16A34A] font-semibold flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> Résolu
          </span>
        </td>
      </tr>
    );
  }

  return (
    <tr className="hover:bg-gray-50/60">
      <td className="px-4 py-2.5 text-gray-400 font-mono text-xs">{issue.line_number ?? "—"}</td>
      <td className="px-4 py-2.5 text-gray-500 font-mono text-xs">{issue.column_name ?? "—"}</td>
      <td className="px-4 py-2.5 font-semibold text-gray-800 text-xs">{issue.raw_value ?? "—"}</td>
      <td className="px-4 py-2.5 text-xs">
        <div className="flex items-center gap-1.5">
          <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full", cfg.bg, cfg.color)}>
            {cfg.label}
          </span>
          <span className="text-gray-600">{issue.problem}</span>
        </div>
      </td>
      <td className="px-4 py-2.5 text-xs font-semibold text-[#16A34A]">
        {issue.suggestion ?? "—"}
      </td>
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-1">
          {issue.suggestion ? (
            <button
              onClick={() => onApply(issue.id)}
              disabled={busy}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#16A34A] text-white hover:bg-green-700 disabled:opacity-50 transition-colors">
              {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
              Appliquer
            </button>
          ) : (
            <button
              onClick={() => onResolve(issue.id)}
              disabled={busy}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 transition-colors">
              {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              Corriger
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function IssueCard({
  issue, onApply, onResolve, resolving,
}: {
  issue: QualityIssue;
  onApply: (id: string) => void;
  onResolve: (id: string) => void;
  resolving: string | null;
}) {
  const cfg = SEV_CFG[issue.severity];
  const busy = resolving === issue.id;

  return (
    <div className={cn("rounded-xl border p-4", issue.is_resolved ? "border-green-100 bg-green-50/40" : "border-gray-100 bg-white")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Ligne {issue.line_number ?? "-"} · {issue.column_name ?? "Colonne inconnue"}
          </p>
          <p className={cn("mt-1 text-sm font-semibold", issue.is_resolved ? "text-gray-400 line-through" : "text-gray-900")}>
            {issue.raw_value ?? "-"}
          </p>
        </div>
        <span className={cn("shrink-0 rounded-full px-2 py-1 text-[10px] font-bold", cfg.bg, cfg.color)}>
          {issue.is_resolved ? "Résolu" : cfg.label}
        </span>
      </div>

      <div className="mt-3 space-y-2 text-xs">
        <div>
          <span className="font-semibold text-gray-500">Problème</span>
          <p className="mt-0.5 text-gray-700">{issue.problem}</p>
        </div>
        {issue.suggestion && (
          <div>
            <span className="font-semibold text-gray-500">Suggestion</span>
            <p className="mt-0.5 font-semibold text-[#16A34A]">{issue.suggestion}</p>
          </div>
        )}
      </div>

      <div className="mt-4 flex justify-end">
        {issue.is_resolved ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#16A34A]">
            <CheckCircle className="h-3.5 w-3.5" /> Résolu
          </span>
        ) : issue.suggestion ? (
          <button
            onClick={() => onApply(issue.id)}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#16A34A] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
            Appliquer
          </button>
        ) : (
          <button
            onClick={() => onResolve(issue.id)}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-200 disabled:opacity-50"
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Corriger
          </button>
        )}
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ValidationPage() {
  const queryClient = useQueryClient();
  const [selectedCheckId, setSelectedCheckId] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm]   = useState(false);

  // ── Liste des contrôles qualité ───────────────────────────────────────────

  const { data: checks = [], isLoading: loadingChecks, refetch: refetchChecks } = useQuery<QualityCheck[]>({
    queryKey: ["quality-checks"],
    queryFn: async () => {
      const { data } = await api.get("/dashboard/quality-checks");
      return data;
    },
  });

  // Sélection automatique du dernier check
  const activeCheck = selectedCheckId
    ? checks.find((c) => c.id === selectedCheckId)
    : checks[0] ?? null;

  // ── Issues du check actif ─────────────────────────────────────────────────

  const { data: checkDetail, refetch: refetchDetail } = useQuery<QualityCheck>({
    queryKey: ["quality-check", activeCheck?.id],
    queryFn: async () => {
      const { data } = await api.get(`/dashboard/quality-checks/${activeCheck!.id}`);
      return data;
    },
    enabled: Boolean(activeCheck?.id),
  });

  const displayCheck  = checkDetail ?? activeCheck;
  const issues        = displayCheck?.issues ?? [];
  const unresolvedCount = issues.filter((i) => !i.is_resolved).length;
  const resolvedCount   = issues.filter((i) =>  i.is_resolved).length;
  const canPublish    = unresolvedCount === 0 && issues.length > 0;

  // ── Mutations ─────────────────────────────────────────────────────────────

  const applySuggestion = useMutation({
    mutationFn: async (issueId: string) => {
      setResolvingId(issueId);
      const { data } = await api.patch(`/dashboard/quality-issues/${issueId}/apply-suggestion`);
      return data;
    },
    onSuccess: () => {
      refetchDetail();
      queryClient.invalidateQueries({ queryKey: ["quality-checks"] });
      toast.success("Suggestion appliquée");
    },
    onError: () => toast.error("Impossible d'appliquer la suggestion"),
    onSettled: () => setResolvingId(null),
  });

  const resolveIssue = useMutation({
    mutationFn: async (issueId: string) => {
      setResolvingId(issueId);
      const { data } = await api.patch(`/dashboard/quality-issues/${issueId}/resolve`);
      return data;
    },
    onSuccess: () => {
      refetchDetail();
      queryClient.invalidateQueries({ queryKey: ["quality-checks"] });
      toast.success("Problème marqué comme résolu");
    },
    onError: () => toast.error("Impossible de résoudre le problème"),
    onSettled: () => setResolvingId(null),
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/dashboard/quality-checks/${activeCheck!.id}/publish`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quality-checks"] });
      queryClient.invalidateQueries({ queryKey: ["admin-datasets"] });
      toast.success("✅ Dataset validé et publié !");
      setShowPublishConfirm(false);
      refetchChecks();
    },
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(detail ?? "Impossible de publier le dataset");
      setShowPublishConfirm(false);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      if (!activeCheck?.dataset_slug) throw new Error("Slug manquant");
      await api.post(`/datasets/${activeCheck.dataset_slug}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quality-checks"] });
      toast.success("Dataset renvoyé pour révision");
      setShowRejectConfirm(false);
      refetchChecks();
    },
    onError: () => {
      toast.error("Impossible de renvoyer le dataset");
      setShowRejectConfirm(false);
    },
  });

  // ── Métriques ─────────────────────────────────────────────────────────────

  const score     = displayCheck?.score ?? 0;
  const circ      = 2 * Math.PI * 36;
  const sColor    = scoreColor(score);

  // ── Rendu ─────────────────────────────────────────────────────────────────

  if (loadingChecks) {
    return (
      <div className="p-6 lg:p-8 flex flex-col items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400 mb-3" />
        <p className="text-gray-500">Chargement des contrôles qualité…</p>
      </div>
    );
  }

  if (checks.length === 0) {
    return (
      <div className="p-6 lg:p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Validation & qualité</h1>
        <div className="flex flex-col items-center py-24 bg-white rounded-2xl border border-gray-100">
          <ClipboardCheck className="w-12 h-12 text-gray-200 mb-4" />
          <p className="font-semibold text-gray-600 mb-2">Aucun contrôle qualité en cours</p>
          <p className="text-sm text-gray-400 text-center max-w-sm">
            Importez un dataset depuis l'onglet "Mes datasets" pour lancer un contrôle qualité.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">

      {/* En-tête */}
      <div>
        {/* Sélecteur de contrôle (si plusieurs) */}
        {checks.length > 1 && (
          <div className="mb-4 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {checks.map((c) => (
              <button key={c.id}
                onClick={() => setSelectedCheckId(c.id)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-semibold border whitespace-nowrap transition-colors",
                  c.id === (activeCheck?.id) ? "bg-[#1A2C42] text-white border-[#1A2C42]"
                                             : "border-gray-200 text-gray-600 hover:border-gray-300"
                )}>
                {c.dataset_slug ?? `Check ${c.id.slice(0, 6)}`}
                <span className={cn("ml-1.5 text-[10px]",
                  c.score >= 90 ? "text-green-400" : c.score >= 75 ? "text-amber-400" : "text-red-400")}>
                  {c.score}%
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <span className={cn("text-xs font-semibold px-3 py-1.5 rounded-full border",
            displayCheck?.status === "completed"
              ? "text-green-700 bg-green-50 border-green-100"
              : "text-amber-700 bg-amber-50 border-amber-100")}>
            {displayCheck?.status === "completed" ? "Complété" : "En validation"}
          </span>
          {activeCheck?.dataset_slug && (
            <span className="text-xs text-gray-500 font-mono">/{activeCheck.dataset_slug}</span>
          )}
          {unresolvedCount > 0 && (
            <span className="text-xs font-semibold text-[#E04E2F] bg-red-50 border border-red-100 px-3 py-1.5 rounded-full">
              {unresolvedCount} problème{unresolvedCount > 1 ? "s" : ""} non résolu{unresolvedCount > 1 ? "s" : ""}
            </span>
          )}
          {canPublish && (
            <span className="text-xs font-semibold text-[#16A34A] bg-green-50 border border-green-100 px-3 py-1.5 rounded-full">
              ✅ Prêt à publier
            </span>
          )}
        </div>

        <div className="flex items-start justify-between gap-3 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Nettoyage & contrôle qualité</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => { refetchChecks(); refetchDetail(); }}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-sm font-medium bg-white hover:bg-gray-50">
              <RefreshCw className="w-3.5 h-3.5" /> Actualiser
            </button>
            {activeCheck?.dataset_slug && (
              <button onClick={() => setShowRejectConfirm(true)}
                disabled={rejectMutation.isPending}
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm font-medium bg-white hover:bg-gray-50 text-[#D97706]">
                <RotateCcw className="w-3.5 h-3.5 inline mr-1" />
                Renvoyer pour révision
              </button>
            )}
            <button
              onClick={() => canPublish ? setShowPublishConfirm(true) : toast.error(`Résolvez les ${unresolvedCount} problème(s) avant de publier`)}
              disabled={publishMutation.isPending}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors",
                canPublish
                  ? "bg-[#16A34A] hover:bg-green-700 text-white"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              )}>
              {publishMutation.isPending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <CheckCircle className="w-4 h-4" />}
              Valider & publier
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
                <circle cx="40" cy="40" r="36" fill="none" stroke={sColor} strokeWidth="6"
                  strokeDasharray={circ} strokeDashoffset={circ * (1 - score / 100)}
                  strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold text-gray-900">{score}</span>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">Score</p>
              <p className="text-lg font-bold" style={{ color: sColor }}>{scoreLabel(score)}</p>
              <p className="text-xs text-gray-400">Cible : ≥ 90</p>
            </div>
          </div>

          {[
            { label: "Complétude",  value: `${displayCheck?.completeness ?? 0}%`, color: "#16A34A" },
            { label: "Cohérence",   value: `${displayCheck?.coherence ?? 0}%`,    color: score >= 75 ? "#D97706" : "#E04E2F" },
            { label: "Doublons",    value: String(displayCheck?.duplicate_count ?? 0), color: "#E04E2F" },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
              <p className="text-3xl font-bold" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Barre de progression résolution */}
        {issues.length > 0 && (
          <div className="mt-5 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs text-gray-500 font-medium">
                Résolution des problèmes : <strong>{resolvedCount}/{issues.length}</strong>
              </p>
              <p className="text-xs text-gray-400">{Math.round((resolvedCount / issues.length) * 100)}%</p>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(resolvedCount / issues.length) * 100}%`,
                  background: resolvedCount === issues.length ? "#16A34A" : "#D97706",
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Tableau des problèmes */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-1 h-4 bg-[#E04E2F] rounded-full" />
            <h2 className="font-bold text-gray-900 text-sm">Lignes problématiques</h2>
            <span className="text-xs text-gray-400">
              {displayCheck?.total_rows ? `${displayCheck.total_rows.toLocaleString("fr-FR")} lignes · ` : ""}
              {issues.length} signalées
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-400" /> {resolvedCount} résolus
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#E04E2F]" /> {unresolvedCount} restants
            </span>
          </div>
        </div>
        <div className="space-y-3 p-4 sm:hidden">
          {issues.length === 0 ? (
            <div className="py-10 text-center text-gray-400">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-gray-200" />
              <p>Aucun problème détecté</p>
            </div>
          ) : (
            issues.map((issue) => (
              <IssueCard
                key={issue.id}
                issue={issue}
                onApply={(id) => applySuggestion.mutate(id)}
                onResolve={(id) => resolveIssue.mutate(id)}
                resolving={resolvingId}
              />
            ))
          )}
        </div>
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                {["Ligne", "Colonne", "Valeur", "Problème", "Suggestion", "Action"].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {issues.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                    <CheckCircle className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                    <p>Aucun problème détecté</p>
                  </td>
                </tr>
              ) : (
                issues.map((issue) => (
                  <IssueRow
                    key={issue.id}
                    issue={issue}
                    onApply={(id) => applySuggestion.mutate(id)}
                    onResolve={(id) => resolveIssue.mutate(id)}
                    resolving={resolvingId}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal confirmation publication */}
      {showPublishConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <button type="button" className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowPublishConfirm(false)} aria-label="Fermer la modale" />
          <FocusTrap
            onEscape={() => setShowPublishConfirm(false)}
            labelledBy="publish-modal-title"
            describedBy="publish-modal-description"
            className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4"
          >
            <h3 id="publish-modal-title" className="font-bold text-gray-900 text-lg mb-2">Valider & publier</h3>
            <p id="publish-modal-description" className="text-gray-500 text-sm mb-1">
              Le dataset <strong className="text-gray-800">/{activeCheck?.dataset_slug}</strong> sera
              visible publiquement sur le portail FasoData.
            </p>
            <p className="text-xs text-green-600 bg-green-50 rounded-xl px-3 py-2 mb-6">
              ✅ Tous les {issues.length} problèmes sont résolus — le score qualité est de <strong>{score}/100</strong>.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowPublishConfirm(false)}
                className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
                Annuler
              </button>
              <button onClick={() => publishMutation.mutate()}
                disabled={publishMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-[#16A34A] hover:bg-green-700 text-white rounded-xl text-sm font-semibold disabled:opacity-60">
                {publishMutation.isPending
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Publication…</>
                  : <><Send className="w-4 h-4" /> Publier maintenant</>}
              </button>
            </div>
          </FocusTrap>
        </div>
      )}

      {/* Modal confirmation renvoi */}
      {showRejectConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <button type="button" className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowRejectConfirm(false)} aria-label="Fermer la modale" />
          <FocusTrap
            onEscape={() => setShowRejectConfirm(false)}
            labelledBy="reject-modal-title"
            describedBy="reject-modal-description"
            className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4"
          >
            <h3 id="reject-modal-title" className="font-bold text-gray-900 text-lg mb-2">Renvoyer pour révision</h3>
            <p id="reject-modal-description" className="text-gray-500 text-sm mb-6">
              Le dataset <strong>/{activeCheck?.dataset_slug}</strong> retournera en brouillon.
              L'organisation pourra le corriger et le soumettre à nouveau.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowRejectConfirm(false)}
                className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
                Annuler
              </button>
              <button onClick={() => rejectMutation.mutate()}
                disabled={rejectMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-[#D97706] hover:bg-amber-700 text-white rounded-xl text-sm font-semibold disabled:opacity-60">
                {rejectMutation.isPending
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi…</>
                  : <><RotateCcw className="w-4 h-4" /> Renvoyer</>}
              </button>
            </div>
          </FocusTrap>
        </div>
      )}
    </div>
  );
}
