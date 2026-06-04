"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FileDown, Loader2, CheckCircle2, Clock, AlertTriangle,
  Download, Database, Filter, RefreshCw, FileText,
} from "lucide-react";
import { api } from "@/lib/api";
import { formatBytes, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Dataset {
  id: string; slug: string; name: string;
  file_format: string | null; row_count: number | null;
}

interface ExportJob {
  id: string;
  datasetId: string;
  datasetName: string;
  taskId: string;
  status: "queued" | "running" | "done" | "error";
  downloadUrl?: string;
  rows?: number;
  createdAt: Date;
}

// ── Composant statut ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ExportJob["status"] }) {
  const cfg = {
    queued:  { label: "En attente", cls: "bg-gray-100 text-gray-600",    icon: Clock },
    running: { label: "En cours",   cls: "bg-blue-100 text-blue-700",    icon: Loader2 },
    done:    { label: "Terminé",    cls: "bg-green-100 text-green-700",  icon: CheckCircle2 },
    error:   { label: "Erreur",     cls: "bg-red-100 text-red-600",      icon: AlertTriangle },
  }[status];
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium", cfg.cls)}>
      <Icon className={cn("w-3 h-3", status === "running" && "animate-spin")} />
      {cfg.label}
    </span>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function RapportsPage() {
  const [selectedId, setSelectedId]     = useState("");
  const [selectedName, setSelectedName] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [jobs, setJobs]                 = useState<ExportJob[]>([]);

  // Polling refs pour les tâches en cours
  const pollingRefs = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  // Charger la liste des datasets
  const { data: dsData } = useQuery({
    queryKey: ["rapports-datasets"],
    queryFn: async () => {
      const { data } = await api.get("/datasets?page_size=100&status=published");
      return data as { items: Dataset[] };
    },
  });
  const datasets = dsData?.items ?? [];

  // Nettoyer les intervals au démontage
  useEffect(() => {
    return () => Object.values(pollingRefs.current).forEach(clearInterval);
  }, []);

  // Démarrer le polling pour un job
  const startPolling = (job: ExportJob) => {
    const interval = setInterval(async () => {
      try {
        const { data } = await api.get(`/reports/tasks/${job.taskId}`);
        if (data.status === "done") {
          clearInterval(pollingRefs.current[job.taskId]);
          delete pollingRefs.current[job.taskId];
          setJobs((prev) =>
            prev.map((j) =>
              j.taskId === job.taskId
                ? { ...j, status: "done", downloadUrl: data.result?.download_url, rows: data.result?.rows }
                : j
            )
          );
          toast.success("Export prêt à télécharger !");
        } else if (data.status === "failure") {
          clearInterval(pollingRefs.current[job.taskId]);
          delete pollingRefs.current[job.taskId];
          setJobs((prev) =>
            prev.map((j) => (j.taskId === job.taskId ? { ...j, status: "error" } : j))
          );
        } else {
          setJobs((prev) =>
            prev.map((j) =>
              j.taskId === job.taskId ? { ...j, status: "running" } : j
            )
          );
        }
      } catch {
        /* ignore */
      }
    }, 2000);
    pollingRefs.current[job.taskId] = interval;
  };

  // Générer un export
  const handleGenerate = async () => {
    if (!selectedId) { toast.error("Sélectionnez un dataset"); return; }
    setIsGenerating(true);
    try {
      const { data } = await api.post(`/reports/${selectedId}/export/csv`, {});
      const job: ExportJob = {
        id: crypto.randomUUID(),
        datasetId: selectedId,
        datasetName: selectedName,
        taskId: data.task_id,
        status: "queued",
        createdAt: new Date(),
      };
      setJobs((prev) => [job, ...prev]);
      startPolling(job);
      toast.success("Export lancé — traitement en cours…");
    } catch {
      toast.error("Impossible de lancer l'export");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGeneratePdf = async () => {
    if (!selectedId) { toast.error("Sélectionnez un dataset"); return; }
    setIsPdfGenerating(true);
    try {
      const response = await api.post(`/reports/${selectedId}/export/pdf`, {}, { responseType: "blob" });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const safeName = (selectedName || "dataset").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      a.href = url;
      a.download = `rapport-${safeName || "dataset"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Rapport PDF généré");
    } catch {
      toast.error("Impossible de générer le PDF");
    } finally {
      setIsPdfGenerating(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl space-y-6">

      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold text-faso-navy">Rapports & Exports</h1>
        <p className="text-gray-500 text-sm mt-1">
          Générez des rapports PDF et des exports CSV depuis vos datasets publiés.
        </p>
      </div>

      {/* Générateur d'export */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-gray-100">
          <div className="w-8 h-8 bg-faso-navy/10 rounded-lg flex items-center justify-center">
            <FileDown className="w-4 h-4 text-faso-navy" />
          </div>
          <h2 className="font-bold text-gray-900">Nouvel export</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          {/* Sélecteur dataset */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Dataset source
            </label>
            <div className="relative">
              <Database className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={selectedId}
                onChange={(e) => {
                  setSelectedId(e.target.value);
                  const ds = datasets.find((d) => d.id === e.target.value);
                  setSelectedName(ds?.name ?? "");
                }}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-faso-navy/20 focus:border-faso-navy/30 bg-white"
              >
                <option value="">— Choisir un dataset —</option>
                {datasets.map((ds) => (
                  <option key={ds.id} value={ds.id}>
                    {ds.name}
                    {ds.row_count != null ? ` (${ds.row_count.toLocaleString("fr-FR")} lignes)` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Bouton */}
          <button
            onClick={handleGenerate}
            disabled={!selectedId || isGenerating}
            className="btn-primary justify-center py-2.5 disabled:opacity-50"
          >
            {isGenerating ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Génération…</>
            ) : (
              <><FileDown className="w-4 h-4" /> Exporter CSV</>
            )}
          </button>

          <button
            onClick={handleGeneratePdf}
            disabled={!selectedId || isPdfGenerating}
            className="btn-secondary justify-center py-2.5 disabled:opacity-50"
          >
            {isPdfGenerating ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> PDF…</>
            ) : (
              <><FileText className="w-4 h-4" /> Rapport PDF</>
            )}
          </button>
        </div>

        {selectedId && (() => {
          const ds = datasets.find((d) => d.id === selectedId);
          return ds ? (
            <div className="mt-4 p-3 bg-blue-50 rounded-xl text-xs text-blue-700 flex items-start gap-2">
              <Filter className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>
                <strong>{ds.name}</strong> — format {ds.file_format?.toUpperCase() ?? "CSV"}
                {ds.row_count != null && `, ${ds.row_count.toLocaleString("fr-FR")} lignes`}.
                Le PDF reprend les métadonnées, statistiques et aperçus disponibles. Le CSV contiendra toutes les données sans filtre.
              </span>
            </div>
          ) : null;
        })()}
      </div>

      {/* Historique des exports */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-faso-navy/10 rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-faso-navy" />
            </div>
            <h2 className="font-bold text-gray-900">Exports de cette session</h2>
          </div>
          {jobs.length > 0 && (
            <span className="text-xs text-gray-400">{jobs.length} export(s)</span>
          )}
        </div>

        {jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-300">
            <FileDown className="w-10 h-10 mb-3" />
            <p className="text-sm text-gray-400 font-medium">Aucun export généré</p>
            <p className="text-xs text-gray-300 mt-1">
              Sélectionnez un dataset ci-dessus et cliquez sur "Exporter CSV"
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {jobs.map((job) => (
              <div key={job.id} className="px-6 py-4 flex items-center gap-4">
                {/* Icône format */}
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold",
                  job.status === "done" ? "bg-green-100 text-green-700" :
                  job.status === "error" ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-700"
                )}>
                  CSV
                </div>

                {/* Infos */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 text-sm truncate">
                    {job.datasetName}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                    <span>{formatDate(job.createdAt.toISOString())}</span>
                    {job.rows != null && (
                      <span>{job.rows.toLocaleString("fr-FR")} lignes exportées</span>
                    )}
                  </div>
                </div>

                {/* Statut */}
                <StatusBadge status={job.status} />

                {/* Action */}
                {job.status === "done" && job.downloadUrl && (
                  <a
                    href={job.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-faso-navy text-white text-xs font-medium rounded-lg hover:bg-faso-navy/90 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Télécharger
                  </a>
                )}
                {job.status === "running" && (
                  <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Aide */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm">
        <h3 className="font-semibold text-amber-800 mb-2">ℹ️ À savoir</h3>
        <ul className="space-y-1 text-amber-700 text-xs">
          <li>• Les exports sont générés de façon asynchrone via Celery.</li>
          <li>• Les liens de téléchargement sont valables <strong>30 minutes</strong>.</li>
          <li>• Pour des exports filtrés avancés, utilisez l'API REST directement.</li>
          <li>• L'historique des exports n'est pas persisté entre sessions.</li>
        </ul>
      </div>
    </div>
  );
}
