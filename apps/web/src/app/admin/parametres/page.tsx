"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Settings, Globe, Database, Bell,
  Save, Loader2, CheckCircle, ToggleLeft, ToggleRight,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface PlatformSettings {
  platform: {
    name: string;
    tagline: string;
    contactEmail: string;
    maxFileSize: string;
    defaultPageSize: string;
  };
  flags: {
    publicRegistration: boolean;
    institutionalUpload: boolean;
    geoVisualization: boolean;
    meilisearchSearch: boolean;
    csvExport: boolean;
    maintenanceMode: boolean;
    emailVerification: boolean;
  };
  updated_at?: string | null;
}

const DEFAULT_SETTINGS: PlatformSettings = {
  platform: {
    name: "FasoData",
    tagline: "Plateforme de données ouvertes du Burkina Faso",
    contactEmail: "contact@fasodata.bf",
    maxFileSize: "100",
    defaultPageSize: "20",
  },
  flags: {
    publicRegistration: true,
    institutionalUpload: true,
    geoVisualization: true,
    meilisearchSearch: true,
    csvExport: true,
    maintenanceMode: false,
    emailVerification: false,
  },
};

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-gray-100">
        <div className="w-8 h-8 bg-faso-navy/10 rounded-lg flex items-center justify-center">
          <Icon className="w-4 h-4 text-faso-navy" />
        </div>
        <h2 className="font-bold text-gray-900">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function Toggle({ enabled, onChange, label }: { enabled: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-700">{label}</span>
      <button type="button" onClick={() => onChange(!enabled)} className="text-gray-400 hover:text-faso-navy transition-colors">
        {enabled ? <ToggleRight className="w-8 h-8 text-faso-navy" /> : <ToggleLeft className="w-8 h-8" />}
      </button>
    </div>
  );
}

export default function ParametresPage() {
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState<PlatformSettings>(DEFAULT_SETTINGS);

  const { data, isLoading } = useQuery<PlatformSettings>({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const { data } = await api.get("/dashboard/admin-settings");
      return data;
    },
  });

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async (payload: PlatformSettings) => {
      const { data } = await api.put("/dashboard/admin-settings", {
        platform: payload.platform,
        flags: payload.flags,
      });
      return data;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(["admin-settings"], updated);
      setSaved(true);
      toast.success("Paramètres enregistrés");
      setTimeout(() => setSaved(false), 3000);
    },
    onError: () => toast.error("Impossible d'enregistrer les paramètres"),
  });

  const updatePlatform = (key: keyof PlatformSettings["platform"], value: string) =>
    setForm((prev) => ({ ...prev, platform: { ...prev.platform, [key]: value } }));

  const setFlag = (key: keyof PlatformSettings["flags"]) => (value: boolean) =>
    setForm((prev) => ({ ...prev, flags: { ...prev.flags, [key]: value } }));

  const handleSave = () => saveMutation.mutate(form);
  const saving = saveMutation.isPending;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Paramètres système</h1>
          <p className="text-gray-500 text-sm mt-1">
            {isLoading ? "Chargement de la configuration..." : "Configuration générale de la plateforme"}
          </p>
        </div>
        <button onClick={handleSave} disabled={saving || isLoading} className="btn-primary">
          {saving ? (
            <><Loader2 className="w-4 h-4 animate-spin" />Sauvegarde...</>
          ) : saved ? (
            <><CheckCircle className="w-4 h-4" />Enregistré</>
          ) : (
            <><Save className="w-4 h-4" />Enregistrer</>
          )}
        </button>
      </div>

      <Section title="Informations de la plateforme" icon={Globe}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nom de la plateforme">
              <input type="text" value={form.platform.name} onChange={(event) => updatePlatform("name", event.target.value)} className="input-field" />
            </Field>
            <Field label="Email de contact">
              <input type="email" value={form.platform.contactEmail} onChange={(event) => updatePlatform("contactEmail", event.target.value)} className="input-field" />
            </Field>
          </div>
          <Field label="Slogan / description courte" hint="Affiché dans le footer et les métadonnées SEO">
            <input type="text" value={form.platform.tagline} onChange={(event) => updatePlatform("tagline", event.target.value)} className="input-field" />
          </Field>
        </div>
      </Section>

      <Section title="Limites & performances" icon={Database}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Taille max. fichier (MB)" hint="Pour les imports CSV/XLSX">
            <input type="number" value={form.platform.maxFileSize} onChange={(event) => updatePlatform("maxFileSize", event.target.value)} min="1" max="500" className="input-field" />
          </Field>
          <Field label="Résultats par page par défaut" hint="Pagination de la liste des datasets">
            <input type="number" value={form.platform.defaultPageSize} onChange={(event) => updatePlatform("defaultPageSize", event.target.value)} min="5" max="100" className="input-field" />
          </Field>
        </div>
      </Section>

      <Section title="Notifications" icon={Bell}>
        <div className="text-sm text-gray-500 mb-4 bg-gray-50 rounded-xl p-3">
          Les canaux email et WhatsApp sont configurés depuis les variables d'environnement. Cette section pilote les fonctions visibles dans l'application.
        </div>
        <Toggle enabled={form.flags.emailVerification} onChange={setFlag("emailVerification")} label="Vérification email à l'inscription" />
      </Section>

      <Section title="Fonctionnalités" icon={Settings}>
        <Toggle enabled={form.flags.publicRegistration} onChange={setFlag("publicRegistration")} label="Inscription publique ouverte" />
        <Toggle enabled={form.flags.institutionalUpload} onChange={setFlag("institutionalUpload")} label="Upload de fichiers institutionnel" />
        <Toggle enabled={form.flags.geoVisualization} onChange={setFlag("geoVisualization")} label="Visualisation géographique" />
        <Toggle enabled={form.flags.meilisearchSearch} onChange={setFlag("meilisearchSearch")} label="Recherche plein texte Meilisearch" />
        <Toggle enabled={form.flags.csvExport} onChange={setFlag("csvExport")} label="Export CSV via Celery" />

        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className={cn("rounded-xl p-4 transition-colors", form.flags.maintenanceMode ? "bg-red-50 border border-red-200" : "bg-gray-50")}>
            <Toggle enabled={form.flags.maintenanceMode} onChange={setFlag("maintenanceMode")} label="Mode maintenance" />
            {form.flags.maintenanceMode && (
              <p className="text-xs text-red-600 mt-2">
                Le portail public doit afficher une page d'avertissement aux visiteurs non authentifiés.
              </p>
            )}
          </div>
        </div>
      </Section>

      <Section title="Variables d'environnement" icon={Settings}>
        <p className="text-xs text-gray-500 mb-4">
          Ces valeurs sont lues au démarrage. Les secrets restent masqués côté interface.
        </p>
        <div className="space-y-2">
          {[
            ["DATABASE_URL", "postgresql+asyncpg://..."],
            ["MINIO_ENDPOINT", "minio:9000"],
            ["MEILISEARCH_URL", "http://meilisearch:7700"],
            ["REDIS_URL", "redis://redis:6379/0"],
            ["JWT_SECRET_KEY", "********************"],
          ].map(([key, value]) => (
            <div key={key} className="flex items-center gap-3 font-mono text-xs bg-gray-50 rounded-xl px-4 py-2.5">
              <span className="text-faso-navy font-semibold w-44 shrink-0">{key}</span>
              <span className="text-gray-500 truncate">{value}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
