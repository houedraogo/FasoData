"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Download, Eye, ArrowLeft, Tag, Calendar, Database,
  FileText, Globe, Info, BarChart3, Table2, Code2,
  CheckCircle, Clock, ExternalLink, Share2, Copy,
  FileSpreadsheet, FileJson
} from "lucide-react";
import { api } from "@/lib/api";
import { formatBytes, formatDate, formatNumber } from "@/lib/utils";
import { DataPreviewTable } from "@/components/datasets/DataPreviewTable";
import { DatasetStatsPanel } from "@/components/datasets/DatasetStatsPanel";
import toast from "react-hot-toast";

type Dataset = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string | null;
  tags: string[];
  source: string | null;
  license: string;
  status: string;
  is_geo: boolean;
  file_format: string | null;
  file_size_bytes: number | null;
  row_count: number | null;
  columns_meta: Array<{ name: string; type: string; null_count: number; unique_count: number }> | null;
  download_count: number;
  view_count: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
};

const licenseInfo: Record<string, { label: string; color: string; url?: string }> = {
  open:        { label: "Open Data",  color: "text-green-700 bg-green-50 border-green-200" },
  "cc-by":     { label: "CC BY 4.0", color: "text-blue-700 bg-blue-50 border-blue-200", url: "https://creativecommons.org/licenses/by/4.0/" },
  "cc-by-sa":  { label: "CC BY-SA",  color: "text-indigo-700 bg-indigo-50 border-indigo-200" },
  "cc-by-nc":  { label: "CC BY-NC",  color: "text-orange-700 bg-orange-50 border-orange-200" },
  proprietary: { label: "Propriétaire", color: "text-gray-700 bg-gray-50 border-gray-200" },
};

type Tab = "preview" | "metadata" | "api";

export default function DatasetDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [activeTab, setActiveTab] = useState<Tab>("preview");
  const [isDownloading, setIsDownloading] = useState(false);

  const { data: dataset, isLoading, error } = useQuery<Dataset>({
    queryKey: ["dataset", slug],
    queryFn: async () => {
      const { data } = await api.get(`/datasets/${slug}`);
      return data;
    },
    enabled: !!slug,
  });

  const { data: preview, isLoading: previewLoading } = useQuery({
    queryKey: ["dataset-preview", slug],
    queryFn: async () => {
      const { data } = await api.get(`/datasets/${slug}/preview?limit=50`);
      return data;
    },
    enabled: !!slug && activeTab === "preview",
    retry: false,
  });

  const { data: stats } = useQuery({
    queryKey: ["dataset-stats", slug],
    queryFn: async () => {
      const { data } = await api.get(`/datasets/${slug}/stats`);
      return data;
    },
    enabled: !!slug,
    retry: false,
  });

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const { data } = await api.get(`/datasets/${slug}/download`);
      if (data.download_url) {
        window.open(data.download_url, "_blank");
        toast.success("Téléchargement démarré");
      }
    } catch {
      toast.error("Fichier non disponible pour le téléchargement direct");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copié`);
  };

  if (isLoading) return <DatasetSkeleton />;

  if (error || !dataset) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Database className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-700 mb-2">Dataset introuvable</h2>
          <Link href="/datasets" className="btn-primary mt-4">
            <ArrowLeft className="w-4 h-4" /> Retour aux datasets
          </Link>
        </div>
      </div>
    );
  }

  const license = licenseInfo[dataset.license] ?? licenseInfo.open;
  const apiBaseUrl = typeof window !== "undefined" ? `${window.location.origin}/api` : "/api";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero header */}
      <div className="bg-faso-navy">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-white/50 text-sm mb-5">
            <Link href="/" className="hover:text-white transition-colors">Accueil</Link>
            <span>/</span>
            <Link href="/datasets" className="hover:text-white transition-colors">Datasets</Link>
            <span>/</span>
            <span className="text-white/80 truncate max-w-xs">{dataset.name}</span>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex-1 min-w-0">
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {dataset.category && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-white/15 text-white/90">
                    {dataset.category}
                  </span>
                )}
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${license.color}`}>
                  {license.label}
                </span>
                {dataset.is_geo && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-700 border border-teal-200">
                    🗺️ Géospatial
                  </span>
                )}
                {dataset.file_format && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-white/10 text-white/70 uppercase">
                    {dataset.file_format}
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight mb-3">
                {dataset.name}
              </h1>

              {dataset.description && (
                <p className="text-white/70 text-sm leading-relaxed max-w-2xl">
                  {dataset.description}
                </p>
              )}

              {/* Tags */}
              {Array.isArray(dataset.tags) && dataset.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {dataset.tags.map((tag) => (
                    <Link
                      key={tag}
                      href={`/datasets?q=${encodeURIComponent(tag)}`}
                      className="flex items-center gap-1 px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-xs text-white/70 hover:text-white transition-all"
                    >
                      <Tag className="w-3 h-3" />
                      {tag}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Actions téléchargement */}
            <div className="flex flex-col gap-3 lg:items-end shrink-0">
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="btn-primary px-6 py-3 text-sm"
              >
                <Download className="w-4 h-4" />
                {isDownloading ? "Préparation..." : "Télécharger"}
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => handleCopy(window.location.href, "URL")}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white rounded-xl text-xs transition-all"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Partager
                </button>
                <Link
                  href={`/carte?dataset=${dataset.slug}`}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs transition-all ${
                    dataset.is_geo
                      ? "bg-teal-500/20 hover:bg-teal-500/30 text-teal-200"
                      : "bg-white/5 text-white/30 cursor-not-allowed pointer-events-none"
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  Voir sur la carte
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Barre de stats */}
        <div className="border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex divide-x divide-white/10 overflow-x-auto">
              {[
                { icon: Database, label: "Lignes", value: dataset.row_count ? formatNumber(dataset.row_count) : "—" },
                { icon: Table2, label: "Colonnes", value: stats?.column_count ? formatNumber(stats.column_count) : "—" },
                { icon: FileText, label: "Taille", value: dataset.file_size_bytes ? formatBytes(dataset.file_size_bytes) : "—" },
                { icon: Eye, label: "Vues", value: formatNumber(dataset.view_count) },
                { icon: Download, label: "Téléchargements", value: formatNumber(dataset.download_count) },
                { icon: Calendar, label: "Mis à jour", value: formatDate(dataset.updated_at) },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-2.5 px-5 py-3.5 shrink-0">
                  <Icon className="w-4 h-4 text-white/40" />
                  <div>
                    <div className="text-xs text-white/40">{label}</div>
                    <div className="text-sm font-semibold text-white">{value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Zone principale */}
          <div className="flex-1 min-w-0">
            {/* Onglets */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex border-b border-gray-100">
                {[
                  { id: "preview" as Tab, icon: Table2, label: "Aperçu des données" },
                  { id: "metadata" as Tab, icon: Info, label: "Métadonnées" },
                  { id: "api" as Tab, icon: Code2, label: "Accès API" },
                ].map(({ id, icon: Icon, label }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-all ${
                      activeTab === id
                        ? "border-faso-red text-faso-red"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>

              <div className="p-0">
                {activeTab === "preview" && (
                  <DataPreviewTable
                    preview={preview}
                    isLoading={previewLoading}
                    datasetName={dataset.name}
                    rowCount={dataset.row_count}
                  />
                )}
                {activeTab === "metadata" && (
                  <MetadataTab dataset={dataset} stats={stats} license={license} />
                )}
                {activeTab === "api" && (
                  <ApiTab slug={dataset.slug} apiBaseUrl={apiBaseUrl} onCopy={handleCopy} />
                )}
              </div>
            </div>
          </div>

          {/* Sidebar droite */}
          <div className="lg:w-72 shrink-0 space-y-4">
            {/* Infos source */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-faso-navy mb-4 text-sm">Informations</h3>
              <dl className="space-y-3 text-sm">
                {dataset.source && (
                  <InfoRow label="Source" value={dataset.source} />
                )}
                <InfoRow label="Licence" value={
                  <span className={`badge border ${license.color}`}>{license.label}</span>
                } />
                <InfoRow label="Format" value={
                  <span className="uppercase font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
                    {dataset.file_format || "—"}
                  </span>
                } />
                {dataset.published_at && (
                  <InfoRow label="Publié le" value={formatDate(dataset.published_at)} />
                )}
                <InfoRow label="Mis à jour" value={formatDate(dataset.updated_at)} />
                <InfoRow label="Slug" value={
                  <code className="text-xs text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded">{dataset.slug}</code>
                } />
              </dl>
            </div>

            {/* Stats colonne (si disponible) */}
            {stats?.columns && stats.columns.length > 0 && (
              <DatasetStatsPanel columns={stats.columns} rowCount={stats.row_count} />
            )}

            {/* Téléchargements */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-faso-navy mb-4 text-sm">Télécharger</h3>
              <div className="space-y-2">
                <button
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-faso-red hover:bg-faso-red/5 transition-all group text-left disabled:opacity-50"
                >
                  <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 group-hover:text-faso-red">
                      {dataset.file_format?.toUpperCase() || "CSV"}
                    </div>
                    <div className="text-xs text-gray-400">
                      {dataset.file_size_bytes ? formatBytes(dataset.file_size_bytes) : "Taille inconnue"}
                    </div>
                  </div>
                  <Download className="w-4 h-4 text-gray-400 group-hover:text-faso-red" />
                </button>

                <div className="flex items-center gap-2 p-3 rounded-xl border border-dashed border-gray-200 opacity-50 cursor-not-allowed">
                  <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                    <FileJson className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-600">JSON</div>
                    <div className="text-xs text-gray-400">Via l'API</div>
                  </div>
                </div>
              </div>

              <p className="text-xs text-gray-400 mt-3 leading-relaxed">
                En téléchargeant, vous acceptez les conditions de la licence{" "}
                <span className="font-medium">{license.label}</span>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sous-composants ─────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-gray-400 shrink-0">{label}</dt>
      <dd className="text-gray-700 text-right font-medium">{value}</dd>
    </div>
  );
}

function MetadataTab({
  dataset,
  stats,
  license,
}: {
  dataset: Dataset;
  stats: any;
  license: { label: string; color: string };
}) {
  return (
    <div className="p-6 space-y-6">
      {dataset.description && (
        <div>
          <h4 className="font-semibold text-faso-navy mb-2 text-sm">Description</h4>
          <p className="text-sm text-gray-600 leading-relaxed">{dataset.description}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { label: "Source officielle", value: dataset.source },
          { label: "Catégorie", value: dataset.category },
          { label: "Format de fichier", value: dataset.file_format?.toUpperCase() },
          { label: "Licence", value: license.label },
          { label: "Nombre de lignes", value: dataset.row_count ? formatNumber(dataset.row_count) : null },
          { label: "Nombre de colonnes", value: stats?.column_count ? formatNumber(stats.column_count) : null },
          { label: "Taille du fichier", value: dataset.file_size_bytes ? formatBytes(dataset.file_size_bytes) : null },
          { label: "Date de publication", value: dataset.published_at ? formatDate(dataset.published_at) : null },
          { label: "Dernière mise à jour", value: formatDate(dataset.updated_at) },
          { label: "Couverture géographique", value: "Burkina Faso" },
          { label: "Données géospatiales", value: dataset.is_geo ? "Oui" : "Non" },
        ]
          .filter((item) => item.value)
          .map(({ label, value }) => (
            <div key={label} className="p-4 bg-gray-50 rounded-xl">
              <div className="text-xs text-gray-400 mb-1">{label}</div>
              <div className="text-sm font-medium text-gray-800">{value}</div>
            </div>
          ))}
      </div>

      {/* Colonnes */}
      {stats?.columns && stats.columns.length > 0 && (
        <div>
          <h4 className="font-semibold text-faso-navy mb-3 text-sm">
            Colonnes ({stats.columns.length})
          </h4>
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-400 uppercase tracking-wide">
                  <th className="text-left px-4 py-2.5">Nom</th>
                  <th className="text-left px-4 py-2.5">Type</th>
                  <th className="text-right px-4 py-2.5">Valeurs uniques</th>
                  <th className="text-right px-4 py-2.5">Valeurs nulles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats.columns.map((col: any) => (
                  <tr key={col.name} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-mono font-medium text-faso-navy">{col.name}</td>
                    <td className="px-4 py-2.5">
                      <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-xs font-mono">
                        {col.type}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-500">
                      {col.unique_count != null ? formatNumber(col.unique_count) : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={col.null_count > 0 ? "text-orange-500" : "text-green-500"}>
                        {col.null_count != null ? formatNumber(col.null_count) : "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function ApiTab({
  slug,
  apiBaseUrl,
  onCopy,
}: {
  slug: string;
  apiBaseUrl: string;
  onCopy: (text: string, label: string) => void;
}) {
  const endpoints = [
    {
      method: "GET",
      label: "Métadonnées du dataset",
      url: `${apiBaseUrl}/datasets/${slug}`,
      description: "Retourne les informations complètes du dataset.",
    },
    {
      method: "GET",
      label: "Aperçu des données",
      url: `${apiBaseUrl}/datasets/${slug}/preview?limit=50`,
      description: "Retourne les 50 premières lignes en JSON.",
    },
    {
      method: "GET",
      label: "Statistiques colonnes",
      url: `${apiBaseUrl}/datasets/${slug}/stats`,
      description: "Retourne les statistiques par colonne (types, nulls, etc.).",
    },
    {
      method: "GET",
      label: "URL de téléchargement",
      url: `${apiBaseUrl}/datasets/${slug}/download`,
      description: "Génère une URL de téléchargement temporaire (30 min).",
    },
  ];

  return (
    <div className="p-6 space-y-5">
      <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
        <p className="text-sm text-blue-700 leading-relaxed">
          Tous les endpoints publics sont accessibles sans authentification.
          Pour les données restreintes, ajoutez <code className="bg-blue-100 px-1.5 py-0.5 rounded text-xs">Authorization: Bearer &lt;token&gt;</code> dans vos requêtes.
        </p>
      </div>

      <div className="space-y-4">
        {endpoints.map(({ method, label, url, description }) => (
          <div key={url} className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-mono font-bold rounded">
                  {method}
                </span>
                <span className="font-medium text-sm text-gray-800">{label}</span>
              </div>
              <button
                onClick={() => onCopy(url, "URL")}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-faso-navy transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                Copier
              </button>
            </div>
            <div className="px-4 py-3">
              <code className="text-xs text-gray-600 break-all block mb-2">{url}</code>
              <p className="text-xs text-gray-400">{description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 bg-gray-50 rounded-xl">
        <p className="text-xs text-gray-500 mb-2 font-medium">Exemple avec curl :</p>
        <pre className="text-xs text-gray-600 overflow-x-auto whitespace-pre-wrap">
          {`curl "${apiBaseUrl}/datasets/${slug}/preview?limit=10"`}
        </pre>
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-400">
        <ExternalLink className="w-3.5 h-3.5" />
        <Link href="/docs" className="hover:text-faso-navy transition-colors">
          Documentation API complète (Swagger UI) →
        </Link>
      </div>
    </div>
  );
}

function DatasetSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-faso-navy py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-pulse">
          <div className="h-3 bg-white/20 rounded w-48 mb-5" />
          <div className="h-8 bg-white/20 rounded w-2/3 mb-3" />
          <div className="h-4 bg-white/10 rounded w-full max-w-lg" />
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 h-96 animate-pulse" />
          <div className="bg-white rounded-2xl border border-gray-100 h-64 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
