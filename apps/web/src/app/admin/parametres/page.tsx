"use client";

import { useState } from "react";
import {
  Settings, Globe, Mail, Database, Bell,
  Save, Loader2, CheckCircle, ToggleLeft, ToggleRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

// ── Composant section ─────────────────────────────────────────────────────────

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

function Toggle({ enabled, onChange, label }: { enabled: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-700">{label}</span>
      <button onClick={() => onChange(!enabled)} className="text-gray-400 hover:text-faso-navy transition-colors">
        {enabled
          ? <ToggleRight className="w-8 h-8 text-faso-navy" />
          : <ToggleLeft className="w-8 h-8" />}
      </button>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ParametresPage() {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

  // Paramètres plateforme
  const [platform, setPlatform] = useState({
    name:         "FasoData",
    tagline:      "Plateforme de données ouvertes du Burkina Faso",
    contactEmail: "contact@fasodata.bf",
    maxFileSize:  "100",
    defaultPageSize: "20",
  });

  // Feature flags
  const [flags, setFlags] = useState({
    publicRegistration:    true,
    institutionalUpload:   true,
    geoVisualization:      true,
    meilisearchSearch:     true,
    csvExport:             true,
    maintenanceMode:       false,
    emailVerification:     false,
  });

  const setFlag = (key: keyof typeof flags) => (val: boolean) =>
    setFlags((prev) => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 900));
    setSaving(false);
    setSaved(true);
    toast.success("Paramètres enregistrés ✅");
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-3xl">

      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Paramètres système</h1>
          <p className="text-gray-500 text-sm mt-1">Configuration générale de la plateforme</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary"
        >
          {saving ? (
            <><Loader2 className="w-4 h-4 animate-spin" />Sauvegarde…</>
          ) : saved ? (
            <><CheckCircle className="w-4 h-4" />Enregistré</>
          ) : (
            <><Save className="w-4 h-4" />Enregistrer</>
          )}
        </button>
      </div>

      {/* Informations plateforme */}
      <Section title="Informations de la plateforme" icon={Globe}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nom de la plateforme">
              <input
                type="text"
                value={platform.name}
                onChange={(e) => setPlatform((p) => ({ ...p, name: e.target.value }))}
                className="input-field"
              />
            </Field>
            <Field label="Email de contact">
              <input
                type="email"
                value={platform.contactEmail}
                onChange={(e) => setPlatform((p) => ({ ...p, contactEmail: e.target.value }))}
                className="input-field"
              />
            </Field>
          </div>
          <Field label="Slogan / Description courte" hint="Affiché dans le footer et les métadonnées SEO">
            <input
              type="text"
              value={platform.tagline}
              onChange={(e) => setPlatform((p) => ({ ...p, tagline: e.target.value }))}
              className="input-field"
            />
          </Field>
        </div>
      </Section>

      {/* Limites */}
      <Section title="Limites & Performances" icon={Database}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Taille max. fichier (MB)" hint="Pour les imports CSV/XLSX">
            <input
              type="number"
              value={platform.maxFileSize}
              onChange={(e) => setPlatform((p) => ({ ...p, maxFileSize: e.target.value }))}
              min="1" max="500"
              className="input-field"
            />
          </Field>
          <Field label="Résultats par page (défaut)" hint="Pagination de la liste des datasets">
            <input
              type="number"
              value={platform.defaultPageSize}
              onChange={(e) => setPlatform((p) => ({ ...p, defaultPageSize: e.target.value }))}
              min="5" max="100"
              className="input-field"
            />
          </Field>
        </div>
      </Section>

      {/* Notifications */}
      <Section title="Notifications" icon={Bell}>
        <div className="text-sm text-gray-500 mb-4 bg-gray-50 rounded-xl p-3">
          Configuration SMTP non encore implémentée. Les notifications email sont désactivées.
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 opacity-50 pointer-events-none">
          <Field label="Serveur SMTP">
            <input type="text" placeholder="smtp.example.com" className="input-field" disabled />
          </Field>
          <Field label="Port">
            <input type="number" placeholder="587" className="input-field" disabled />
          </Field>
        </div>
      </Section>

      {/* Feature flags */}
      <Section title="Fonctionnalités" icon={Settings}>
        <Toggle enabled={flags.publicRegistration}  onChange={setFlag("publicRegistration")}  label="Inscription publique ouverte" />
        <Toggle enabled={flags.institutionalUpload}  onChange={setFlag("institutionalUpload")}  label="Upload de fichiers (institutionnel)" />
        <Toggle enabled={flags.geoVisualization}     onChange={setFlag("geoVisualization")}     label="Visualisation géographique (Leaflet)" />
        <Toggle enabled={flags.meilisearchSearch}    onChange={setFlag("meilisearchSearch")}    label="Recherche plein texte (Meilisearch)" />
        <Toggle enabled={flags.csvExport}            onChange={setFlag("csvExport")}            label="Export CSV via Celery" />
        <Toggle enabled={flags.emailVerification}    onChange={setFlag("emailVerification")}    label="Vérification email à l'inscription" />

        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className={cn(
            "rounded-xl p-4 transition-colors",
            flags.maintenanceMode ? "bg-red-50 border border-red-200" : "bg-gray-50"
          )}>
            <Toggle
              enabled={flags.maintenanceMode}
              onChange={setFlag("maintenanceMode")}
              label="Mode maintenance (affiche une page d'avertissement)"
            />
            {flags.maintenanceMode && (
              <p className="text-xs text-red-600 mt-2">
                ⚠️ En mode maintenance, le portail public est inaccessible aux visiteurs non authentifiés.
              </p>
            )}
          </div>
        </div>
      </Section>

      {/* Variables d'environnement (info seule) */}
      <Section title="Variables d'environnement" icon={Settings}>
        <p className="text-xs text-gray-500 mb-4">
          Ces valeurs sont lues depuis le fichier <code className="font-mono bg-gray-100 px-1 rounded">.env</code> au démarrage.
          Pour les modifier, éditez le fichier et redémarrez les services.
        </p>
        <div className="space-y-2">
          {[
            ["DATABASE_URL",         "postgresql+asyncpg://…"],
            ["MINIO_ENDPOINT",       "minio:9000"],
            ["MEILISEARCH_URL",      "http://meilisearch:7700"],
            ["REDIS_URL",            "redis://redis:6379/0"],
            ["JWT_SECRET_KEY",       "••••••••••••••••••••"],
          ].map(([key, val]) => (
            <div key={key} className="flex items-center gap-3 font-mono text-xs bg-gray-50 rounded-xl px-4 py-2.5">
              <span className="text-faso-navy font-semibold w-44 shrink-0">{key}</span>
              <span className="text-gray-500 truncate">{val}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
