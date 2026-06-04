"use client";

import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, X, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { formatBytes } from "@/lib/utils";
import toast from "react-hot-toast";

const schema = z.object({
  name:        z.string().min(3, "Minimum 3 caractères"),
  description: z.string().optional(),
  category:    z.string().min(1, "Catégorie requise"),
  license:     z.string().default("open"),
  delimiter:   z.string().default(","),
  has_header:  z.boolean().default(true),
  lat_field:   z.string().optional(),
  lon_field:   z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const CATEGORIES = [
  "Agriculture", "Santé", "Éducation", "Économie",
  "Géographie", "Environnement", "Sécurité alimentaire",
  "Infrastructure", "Gouvernance",
];

const LICENSES = [
  { value: "open",        label: "Open Data (CC0)" },
  { value: "cc-by",       label: "CC BY 4.0" },
  { value: "cc-by-sa",    label: "CC BY-SA 4.0" },
  { value: "cc-by-nc",    label: "CC BY-NC 4.0" },
  { value: "proprietary", label: "Propriétaire" },
];

type JobStatus = "idle" | "uploading" | "processing" | "done" | "error";

export default function ImportPage() {
  const [file, setFile]           = useState<File | null>(null);
  const [jobId, setJobId]         = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus>("idle");
  const [jobProgress, setJobProgress] = useState(0);
  const [rowsImported, setRowsImported] = useState(0);
  const [jobError, setJobError]   = useState<string | null>(null);
  const [datasetSlug, setDatasetSlug] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { delimiter: ",", has_header: true, license: "open" },
  });

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024, // 50 Mo
    onDrop: (accepted) => { if (accepted[0]) setFile(accepted[0]); },
    onDropRejected: () => toast.error("Fichier rejeté — format ou taille invalide"),
  });

  const pollJobStatus = (id: string) => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const { data } = await api.get(`/datasets/jobs/${id}`);
        setJobProgress(data.progress ?? 0);
        if (data.status === "done") {
          clearInterval(interval);
          setJobStatus("done");
          setRowsImported(data.rows_imported ?? 0);
          toast.success(`✅ Import terminé — ${data.rows_imported ?? 0} lignes importées`);
        } else if (data.status === "failed" || data.status === "error") {
          clearInterval(interval);
          setJobStatus("error");
          setJobError(data.error_message || "Erreur inconnue lors de l'import");
          toast.error("Échec de l'import");
        } else if (attempts > 90) {
          // Timeout après 3 minutes
          clearInterval(interval);
          setJobStatus("error");
          setJobError("Timeout — l'import prend trop de temps. Vérifiez les logs.");
        }
      } catch {
        if (attempts > 5) {
          clearInterval(interval);
          setJobStatus("error");
          setJobError("Impossible de récupérer le statut du job");
        }
      }
    }, 2000);
  };

  const onSubmit = async (formData: FormData) => {
    if (!file) { toast.error("Veuillez sélectionner un fichier CSV ou XLSX"); return; }

    setJobStatus("uploading");
    setJobError(null);
    setJobProgress(0);

    try {
      // 1. Créer le dataset
      const { data: dataset } = await api.post("/datasets", {
        name:        formData.name,
        description: formData.description || "",
        category:    formData.category,
        license:     formData.license,
      });
      setDatasetSlug(dataset.slug);

      // 2. Uploader le fichier
      const form = new FormData();
      form.append("file",       file);
      form.append("delimiter",  formData.delimiter);
      form.append("has_header", String(formData.has_header));
      if (formData.lat_field) form.append("lat_field", formData.lat_field);
      if (formData.lon_field) form.append("lon_field", formData.lon_field);

      setJobStatus("processing");
      const { data: job } = await api.post(`/datasets/${dataset.slug}/upload`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setJobId(job.id);
      pollJobStatus(job.id);

    } catch (err: unknown) {
      setJobStatus("error");
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setJobError(detail || "Erreur lors de l'import. Vérifiez le format du fichier.");
      toast.error("Erreur lors de l'import");
    }
  };

  const handleReset = () => {
    setJobStatus("idle");
    setFile(null);
    setJobId(null);
    setJobProgress(0);
    setJobError(null);
    setDatasetSlug(null);
    setRowsImported(0);
    reset();
  };

  // ── État succès ────────────────────────────────────────────────────────────
  if (jobStatus === "done") {
    return (
      <div className="p-8 max-w-lg mx-auto text-center mt-16">
        <div className="w-20 h-20 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Import réussi !</h2>
        <p className="text-gray-500 mb-2">
          <strong className="text-green-600">{rowsImported.toLocaleString("fr-FR")} lignes</strong> importées et indexées.
        </p>
        {datasetSlug && (
          <p className="text-xs text-gray-400 mb-8 font-mono">/datasets/{datasetSlug}</p>
        )}
        <div className="flex gap-3 justify-center flex-wrap">
          <button onClick={handleReset} className="btn-secondary">
            Nouvel import
          </button>
          {datasetSlug && (
            <Link href={`/datasets/${datasetSlug}`} className="btn-primary">
              Voir le dataset
            </Link>
          )}
          <Link href="/dashboard/datasets" className="btn-secondary">
            Mes datasets
          </Link>
        </div>
      </div>
    );
  }

  const isBusy = jobStatus === "uploading" || jobStatus === "processing";

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">

      {/* En-tête */}
      <div className="flex items-center gap-3 mb-5 sm:mb-6">
        <Link href="/dashboard/datasets"
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-[#1A2C42]">Importer des données</h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-0.5">CSV, XLSX · max 50 Mo</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">

        {/* ── Zone de dépôt ── */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-2xl p-6 sm:p-10 text-center cursor-pointer transition-all ${
            isBusy ? "opacity-50 pointer-events-none" :
            isDragActive ? "border-[#E04E2F] bg-[#E04E2F]/5 scale-[1.01]" :
            file ? "border-green-400 bg-green-50" :
            "border-gray-200 hover:border-[#E04E2F] hover:bg-[#E04E2F]/5"
          }`}
        >
          <input {...getInputProps()} />
          {file ? (
            <div className="flex items-center justify-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
              <div className="text-left flex-1">
                <p className="font-semibold text-gray-800">{file.name}</p>
                <p className="text-sm text-gray-500">{formatBytes(file.size)}</p>
              </div>
              <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); }}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div>
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-gray-400" />
              </div>
              <p className="font-semibold text-gray-700 text-lg">
                {isDragActive ? "Déposez le fichier ici…" : "Glissez un fichier CSV ou XLSX"}
              </p>
              <p className="text-gray-400 text-sm mt-1">ou cliquez pour ouvrir le sélecteur</p>
            </div>
          )}
        </div>

        {/* ── Métadonnées ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
          <h2 className="font-bold text-gray-900">Informations du dataset</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Nom du dataset <span className="text-[#E04E2F]">*</span>
            </label>
            <input {...register("name")} className="input-field"
              placeholder="Ex: Prix des céréales 2024" disabled={isBusy} />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <textarea {...register("description")} rows={3} className="input-field resize-none"
              placeholder="Décrivez brièvement ce dataset…" disabled={isBusy} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Catégorie <span className="text-[#E04E2F]">*</span>
              </label>
              <select {...register("category")} className="input-field" disabled={isBusy}>
                <option value="">Choisir une catégorie…</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Licence</label>
              <select {...register("license")} className="input-field" disabled={isBusy}>
                {LICENSES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* ── Options CSV ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="font-bold text-gray-900">Options d'import</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Séparateur CSV</label>
              <select {...register("delimiter")} className="input-field" disabled={isBusy}>
                <option value=",">Virgule (,) — par défaut</option>
                <option value=";">Point-virgule (;) — Excel FR</option>
                <option value="|">Pipe (|)</option>
                <option value="\t">Tabulation</option>
              </select>
            </div>
            <div className="flex items-center gap-3 pt-7">
              <input type="checkbox" {...register("has_header")} id="has_header"
                className="w-4 h-4 text-[#E04E2F] rounded border-gray-300 focus:ring-[#E04E2F]/20" disabled={isBusy} />
              <label htmlFor="has_header" className="text-sm text-gray-700">
                La 1ère ligne est un en-tête
              </label>
            </div>
          </div>

          {/* Colonnes géo optionnelles */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">Colonnes géographiques (optionnel)</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Nom de la colonne latitude</label>
                <input {...register("lat_field")} className="input-field text-sm"
                  placeholder="lat" disabled={isBusy} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Nom de la colonne longitude</label>
                <input {...register("lon_field")} className="input-field text-sm"
                  placeholder="lon" disabled={isBusy} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Barre de progression ── */}
        {isBusy && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin shrink-0" />
              <div>
                <p className="font-semibold text-blue-700">
                  {jobStatus === "uploading" ? "Envoi du fichier…" : `Traitement en cours — ${jobProgress}%`}
                </p>
                <p className="text-xs text-blue-500 mt-0.5">
                  {jobStatus === "uploading" ? "Téléversement en cours" : "Celery traite les données en arrière-plan"}
                </p>
              </div>
            </div>
            {jobStatus === "processing" && (
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${jobProgress}%` }} />
              </div>
            )}
          </div>
        )}

        {/* ── Erreur ── */}
        {jobStatus === "error" && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-red-700 text-sm font-semibold">Erreur d'import</p>
              <p className="text-red-600 text-xs mt-0.5">{jobError}</p>
            </div>
            <button type="button" onClick={handleReset}
              className="ml-auto text-xs text-red-500 hover:underline shrink-0">
              Réessayer
            </button>
          </div>
        )}

        {/* ── Bouton submit ── */}
        <button type="submit" disabled={isBusy || !file}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#E04E2F] hover:bg-[#c73e22]
                     disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl
                     text-sm transition-colors">
          {isBusy ? (
            <><Loader2 className="w-4 h-4 animate-spin" />
              {jobStatus === "uploading" ? "Envoi en cours…" : "Traitement en cours…"}
            </>
          ) : (
            <><Upload className="w-4 h-4" /> Lancer l'import</>
          )}
        </button>

        {!file && (
          <p className="text-center text-xs text-gray-400">
            Sélectionnez d'abord un fichier CSV ou XLSX
          </p>
        )}
      </form>
    </div>
  );
}
