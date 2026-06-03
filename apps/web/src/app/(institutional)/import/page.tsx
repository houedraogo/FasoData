"use client";

import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, X } from "lucide-react";
import { api } from "@/lib/api";
import { formatBytes } from "@/lib/utils";
import toast from "react-hot-toast";

const schema = z.object({
  name: z.string().min(3, "Minimum 3 caractères"),
  description: z.string().optional(),
  category: z.string().min(1, "Catégorie requise"),
  delimiter: z.string().default(","),
  has_header: z.boolean().default(true),
  lat_field: z.string().optional(),
  lon_field: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const categories = ["Agriculture", "Santé", "Éducation", "Économie", "Géographie", "Environnement"];

type JobStatus = "idle" | "uploading" | "processing" | "done" | "error";

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus>("idle");
  const [jobProgress, setJobProgress] = useState(0);
  const [jobError, setJobError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { delimiter: ",", has_header: true },
  });

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "text/csv": [".csv"], "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"] },
    maxFiles: 1,
    onDrop: (files) => setFile(files[0] ?? null),
  });

  const pollJobStatus = async (id: string) => {
    const interval = setInterval(async () => {
      try {
        const { data } = await api.get(`/datasets/jobs/${id}`);
        setJobProgress(data.progress);
        if (data.status === "done") {
          clearInterval(interval);
          setJobStatus("done");
          toast.success(`Import terminé — ${data.rows_imported} lignes importées`);
        } else if (data.status === "failed") {
          clearInterval(interval);
          setJobStatus("error");
          setJobError(data.error_message || "Erreur inconnue");
          toast.error("Échec de l'import");
        }
      } catch {
        clearInterval(interval);
      }
    }, 2000);
  };

  const onSubmit = async (formData: FormData) => {
    if (!file) {
      toast.error("Veuillez sélectionner un fichier");
      return;
    }

    setJobStatus("uploading");
    try {
      // 1. Créer le dataset
      const { data: dataset } = await api.post("/datasets", {
        name: formData.name,
        description: formData.description,
        category: formData.category,
      });

      // 2. Uploader le fichier
      const form = new FormData();
      form.append("file", file);
      form.append("delimiter", formData.delimiter);
      form.append("has_header", String(formData.has_header));
      if (formData.lat_field) form.append("lat_field", formData.lat_field);
      if (formData.lon_field) form.append("lon_field", formData.lon_field);

      setJobStatus("processing");
      const { data: job } = await api.post(`/datasets/${dataset.slug}/upload`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setJobId(job.id);
      await pollJobStatus(job.id);
    } catch (err: any) {
      setJobStatus("error");
      setJobError(err?.response?.data?.detail || "Erreur lors de l'import");
      toast.error("Erreur lors de l'import");
    }
  };

  if (jobStatus === "done") {
    return (
      <div className="p-8 max-w-lg mx-auto text-center mt-20">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-faso-navy mb-2">Import réussi !</h2>
        <p className="text-gray-500 mb-6">Votre dataset a été importé et indexé avec succès.</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => { setJobStatus("idle"); setFile(null); setJobId(null); }}
            className="btn-secondary"
          >
            Nouvel import
          </button>
          <a href="/dashboard" className="btn-primary">Voir mes datasets</a>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-faso-navy mb-1">Importer des données</h1>
      <p className="text-gray-500 text-sm mb-8">Formats acceptés : CSV, XLSX (max 50 Mo)</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Zone de dépôt */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
            isDragActive
              ? "border-faso-red bg-faso-red/5"
              : file
              ? "border-green-400 bg-green-50"
              : "border-gray-300 hover:border-faso-red hover:bg-faso-red/5"
          }`}
        >
          <input {...getInputProps()} />
          {file ? (
            <div className="flex items-center justify-center gap-3">
              <FileText className="w-8 h-8 text-green-600" />
              <div className="text-left">
                <div className="font-medium text-gray-800">{file.name}</div>
                <div className="text-sm text-gray-500">{formatBytes(file.size)}</div>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setFile(null); }}
                className="ml-2 text-gray-400 hover:text-red-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div>
              <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">
                {isDragActive ? "Déposez ici..." : "Glissez un fichier CSV ou XLSX"}
              </p>
              <p className="text-gray-400 text-sm mt-1">ou cliquez pour sélectionner</p>
            </div>
          )}
        </div>

        {/* Métadonnées */}
        <div className="card p-6 space-y-5">
          <h2 className="font-semibold text-faso-navy">Informations du dataset</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom du dataset *</label>
            <input {...register("name")} className="input-field" placeholder="Ex: Prix des céréales 2024" />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <textarea
              {...register("description")}
              rows={3}
              className="input-field resize-none"
              placeholder="Décrivez brièvement ce dataset..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Catégorie *</label>
              <select {...register("category")} className="input-field">
                <option value="">Choisir...</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Séparateur CSV</label>
              <select {...register("delimiter")} className="input-field">
                <option value=",">Virgule (,)</option>
                <option value=";">Point-virgule (;)</option>
                <option value="\t">Tabulation</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" {...register("has_header")} id="has_header" className="w-4 h-4 text-faso-red rounded" />
            <label htmlFor="has_header" className="text-sm text-gray-700">La première ligne est un en-tête</label>
          </div>

          {/* Champs géo optionnels */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">Colonnes géographiques (optionnel)</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Colonne latitude</label>
                <input {...register("lat_field")} className="input-field" placeholder="lat" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Colonne longitude</label>
                <input {...register("lon_field")} className="input-field" placeholder="lon" />
              </div>
            </div>
          </div>
        </div>

        {/* Statut du job */}
        {jobStatus === "processing" && (
          <div className="card p-5 border-blue-200 bg-blue-50">
            <div className="flex items-center gap-3 mb-3">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              <span className="font-medium text-blue-700">Import en cours... {jobProgress}%</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${jobProgress}%` }}
              />
            </div>
          </div>
        )}

        {jobStatus === "error" && (
          <div className="card p-4 border-red-200 bg-red-50 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <p className="text-red-700 text-sm">{jobError}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || jobStatus === "processing" || jobStatus === "uploading"}
          className="w-full btn-primary justify-center py-3"
        >
          {isSubmitting || jobStatus !== "idle" ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {jobStatus === "uploading" ? "Envoi..." : "Traitement..."}
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Lancer l'import
            </>
          )}
        </button>
      </form>
    </div>
  );
}
