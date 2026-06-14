"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  BookOpen,
  Braces,
  CheckCircle,
  Copy,
  Database,
  Download,
  Globe,
  KeyRound,
  Layers,
  Lock,
  Map,
  RefreshCw,
  Search,
  Server,
  Shield,
  Terminal,
  Timer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";

type Lang = "curl" | "python" | "javascript";
type Endpoint = { method: string; path: string; scope: string; desc: string; tag?: string };
type OpenApiOperation = {
  summary?: string;
  description?: string;
  tags?: string[];
  security?: Array<Record<string, string[]>>;
};
type OpenApiSchema = {
  openapi?: string;
  info?: { title?: string; version?: string; description?: string };
  paths?: Record<string, Record<string, OpenApiOperation>>;
};

const BASE_URL = "https://api.fasodata.bf";

const QUICK_START: Record<Lang, string> = {
  curl: `curl -X POST "${BASE_URL}/api/auth/login" \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "username=demo@ong.bf&password=********"

curl "${BASE_URL}/api/datasets?page=1&page_size=10" \\
  -H "Authorization: Bearer $FASODATA_TOKEN"`,
  python: `import requests

BASE_URL = "${BASE_URL}"

login = requests.post(
    f"{BASE_URL}/api/auth/login",
    data={"username": "demo@ong.bf", "password": "********"},
)
token = login.json()["access_token"]

datasets = requests.get(
    f"{BASE_URL}/api/datasets",
    headers={"Authorization": f"Bearer {token}"},
    params={"page": 1, "page_size": 10},
)
print(datasets.json())`,
  javascript: `const BASE_URL = "${BASE_URL}";

const login = await fetch(\`\${BASE_URL}/api/auth/login\`, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    username: "demo@ong.bf",
    password: "********",
  }),
});

const { access_token } = await login.json();

const datasets = await fetch(\`\${BASE_URL}/api/datasets?page=1&page_size=10\`, {
  headers: { Authorization: \`Bearer \${access_token}\` },
});

console.log(await datasets.json());`,
};

const SDK_SNIPPETS: Record<Lang, string> = {
  curl: `export FASODATA_TOKEN="<access_token>"

curl "${BASE_URL}/api/search?q=prix%20mil" \\
  -H "Authorization: Bearer $FASODATA_TOKEN"

curl "${BASE_URL}/api/prices/latest?region=National&sources=wfp" \\
  -H "Authorization: Bearer $FASODATA_TOKEN"`,
  python: `from typing import Any
import requests

class FasoDataClient:
    def __init__(self, token: str, base_url: str = "${BASE_URL}"):
        self.base_url = base_url.rstrip("/")
        self.headers = {"Authorization": f"Bearer {token}"}

    def get(self, path: str, **params: Any):
        response = requests.get(
            f"{self.base_url}{path}",
            headers=self.headers,
            params=params,
            timeout=30,
        )
        response.raise_for_status()
        return response.json()

client = FasoDataClient("<access_token>")
print(client.get("/api/prices/latest", region="National", sources="wfp"))`,
  javascript: `class FasoDataClient {
  constructor(token, baseUrl = "${BASE_URL}") {
    this.token = token;
    this.baseUrl = baseUrl.replace(/\\/$/, "");
  }

  async get(path, params = {}) {
    const url = new URL(\`\${this.baseUrl}\${path}\`);
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
    const response = await fetch(url, {
      headers: { Authorization: \`Bearer \${this.token}\` },
    });
    if (!response.ok) throw new Error(\`FasoData API error \${response.status}\`);
    return response.json();
  }
}

const client = new FasoDataClient("<access_token>");
console.log(await client.get("/api/prices/latest", { region: "National", sources: "wfp" }));`,
};

const FALLBACK_ENDPOINTS: Endpoint[] = [
  { method: "GET", path: "/api/health", scope: "Public", desc: "Etat du service API et version courante." },
  { method: "POST", path: "/api/auth/register", scope: "Public", desc: "Cree un compte utilisateur." },
  { method: "POST", path: "/api/auth/login", scope: "Public", desc: "Retourne un access token et un refresh token." },
  { method: "POST", path: "/api/auth/refresh", scope: "Public", desc: "Renouvelle une session avec un refresh token." },
  { method: "GET", path: "/api/auth/me", scope: "Bearer", desc: "Profil du compte connecte." },
  { method: "GET", path: "/api/datasets", scope: "Public", desc: "Catalogue pagine des datasets publies." },
  { method: "POST", path: "/api/datasets", scope: "Institution", desc: "Cree un dataset brouillon." },
  { method: "GET", path: "/api/datasets/my", scope: "Bearer", desc: "Datasets de l'utilisateur connecte." },
  { method: "GET", path: "/api/datasets/{slug}", scope: "Public", desc: "Fiche detaillee d'un dataset." },
  { method: "PATCH", path: "/api/datasets/{slug}", scope: "Institution", desc: "Met a jour les metadonnees ou le statut." },
  { method: "GET", path: "/api/datasets/{slug}/preview", scope: "Public", desc: "Apercu tabulaire limite a 200 lignes." },
  { method: "GET", path: "/api/datasets/{slug}/stats", scope: "Public", desc: "Nombre de lignes, colonnes et metadonnees." },
  { method: "GET", path: "/api/datasets/{slug}/download", scope: "Public", desc: "Lien de telechargement temporaire." },
  { method: "POST", path: "/api/datasets/{slug}/upload", scope: "Institution", desc: "Importe un CSV/XLSX et lance un job Celery." },
  { method: "GET", path: "/api/datasets/{slug}/jobs", scope: "Institution", desc: "Historique des imports d'un dataset." },
  { method: "GET", path: "/api/datasets/jobs/{job_id}", scope: "Institution", desc: "Etat d'un job d'import." },
  { method: "GET", path: "/api/search", scope: "Public", desc: "Recherche plein texte multi-index ou dataset cible." },
  { method: "GET", path: "/api/geo/{dataset_id}/bbox", scope: "Public", desc: "Features GeoJSON dans une emprise." },
  { method: "GET", path: "/api/geo/{dataset_id}/centroid", scope: "Public", desc: "Centre, bbox et total d'un dataset geo." },
  { method: "POST", path: "/api/reports/{dataset_id}/export/csv", scope: "Institution", desc: "Lance un export CSV asynchrone." },
  { method: "GET", path: "/api/reports/tasks/{task_id}", scope: "Institution", desc: "Recupere l'etat ou le resultat d'une tache." },
  { method: "GET", path: "/api/users", scope: "Admin", desc: "Liste paginee des utilisateurs." },
  { method: "PATCH", path: "/api/users/me", scope: "Bearer", desc: "Met a jour le profil connecte." },
  { method: "GET", path: "/api/dashboard/alert-rules", scope: "Public", desc: "Liste les regles d'alerte configurees." },
  { method: "POST", path: "/api/dashboard/alert-rules", scope: "Institution", desc: "Cree une regle de seuil et notification." },
  { method: "GET", path: "/api/dashboard/system-metrics", scope: "Public", desc: "Historique des metriques techniques." },
  { method: "POST", path: "/api/dashboard/system-metrics", scope: "Admin", desc: "Enregistre une mesure de supervision." },
  { method: "GET", path: "/api/dashboard/team-members", scope: "Bearer", desc: "Liste les membres d'equipe d'une organisation." },
  { method: "POST", path: "/api/dashboard/team-members", scope: "Institution", desc: "Invite ou rattache un membre d'equipe." },
  { method: "GET", path: "/api/dashboard/quality-checks", scope: "Public", desc: "Liste les controles qualite datasets." },
  { method: "POST", path: "/api/dashboard/quality-checks", scope: "Institution", desc: "Cree un controle qualite avec anomalies." },
  { method: "PATCH", path: "/api/dashboard/quality-issues/{issue_id}/resolve", scope: "Institution", desc: "Marque une anomalie qualite comme resolue." },
];

const API_VERSIONS = [
  { version: "v1", status: "Stable", text: "Version courante exposee par FastAPI et documentee via OpenAPI." },
  { version: "v1.1", status: "A venir", text: "Endpoints prix multi-pays, webhooks et SDK publics stabilises." },
];

const ERROR_CODES = [
  { code: "400", label: "Bad Request", desc: "Parametres invalides ou compte desactive." },
  { code: "401", label: "Unauthorized", desc: "Token absent, expire ou invalide." },
  { code: "403", label: "Forbidden", desc: "Role insuffisant pour la ressource." },
  { code: "404", label: "Not Found", desc: "Dataset, utilisateur ou ressource introuvable." },
  { code: "409", label: "Conflict", desc: "Email deja utilise ou ressource dupliquee." },
  { code: "422", label: "Validation Error", desc: "Payload ou fichier non conforme." },
];

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-green-50 text-green-700 ring-green-100",
  POST: "bg-blue-50 text-blue-700 ring-blue-100",
  PATCH: "bg-amber-50 text-amber-700 ring-amber-100",
  DELETE: "bg-red-50 text-red-700 ring-red-100",
};

function inferScope(operation: OpenApiOperation): string {
  const joined = JSON.stringify(operation.security ?? "").toLowerCase();
  if (!operation.security || operation.security.length === 0) return "Public";
  if (joined.includes("admin")) return "Admin";
  return "Bearer";
}

function endpointsFromOpenApi(schema: OpenApiSchema | null): Endpoint[] {
  if (!schema?.paths) return FALLBACK_ENDPOINTS;
  return Object.entries(schema.paths)
    .flatMap(([path, methods]) =>
      Object.entries(methods)
        .filter(([method]) => METHOD_COLORS[method.toUpperCase()])
        .map(([method, operation]) => ({
          method: method.toUpperCase(),
          path,
          scope: inferScope(operation),
          desc: operation.summary || operation.description || "Endpoint expose par l'API FasoData.",
          tag: operation.tags?.[0] ?? "General",
        }))
    )
    .sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
}

function CodeBlock({ code, exampleLabel, copyLabel, copiedLabel }: { code: string; exampleLabel: string; copyLabel: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard?.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-slate-700 bg-[#0F172A]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
        <span className="text-xs font-semibold text-slate-300">{exampleLabel}</span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold text-white"
          aria-label={copyLabel}
        >
          <Copy className="h-3.5 w-3.5" /> {copied ? copiedLabel : copyLabel}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-sm leading-6 text-slate-100">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function DevelopersPage() {
  const { t } = useLanguage();
  const [lang, setLang] = useState<Lang>("curl");
  const [schema, setSchema] = useState<OpenApiSchema | null>(null);
  const [schemaError, setSchemaError] = useState(false);
  const [schemaLoading, setSchemaLoading] = useState(true);
  const [query, setQuery] = useState("");

  const loadSchema = async () => {
    setSchemaLoading(true);
    setSchemaError(false);
    try {
      const response = await fetch("/openapi.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`OpenAPI ${response.status}`);
      setSchema(await response.json());
    } catch {
      setSchema(null);
      setSchemaError(true);
    } finally {
      setSchemaLoading(false);
    }
  };

  useEffect(() => {
    loadSchema();
  }, []);

  const endpoints = useMemo(() => endpointsFromOpenApi(schema), [schema]);
  const tags = useMemo(() => Array.from(new Set(endpoints.map((endpoint) => endpoint.tag ?? "General"))).sort(), [endpoints]);
  const filteredEndpoints = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return endpoints;
    return endpoints.filter((endpoint) =>
      [endpoint.method, endpoint.path, endpoint.scope, endpoint.desc, endpoint.tag]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }, [endpoints, query]);

  return (
    <div className="bg-[#F6F8FB] text-gray-900">
      <section className="border-b border-slate-800 bg-[#101827] text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.1fr_.9fr] lg:px-8 lg:py-16">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80 ring-1 ring-white/10">
              <Activity className="h-3.5 w-3.5 text-[#E04E2F]" />
              {t("dev.badge")}
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
              {t("dev.title")}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">
              {t("dev.description")}
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-slate-300">
              <span className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/10">
                {schema?.info?.title ?? "FasoData API"}
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/10">
                Version {schema?.info?.version ?? "1.0.0"}
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/10">
                OpenAPI {schema?.openapi ?? "3.x"}
              </span>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#quickstart" className="inline-flex items-center gap-2 rounded-xl bg-[#E04E2F] px-5 py-3 text-sm font-bold text-white">
                <Terminal className="h-4 w-4" /> {t("dev.startButton")}
              </a>
              <a href="/docs" className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-5 py-3 text-sm font-bold text-white/90">
                <BookOpen className="h-4 w-4" /> {t("dev.swaggerui")}
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-2xl">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-300">
              <KeyRound className="h-4 w-4 text-[#E04E2F]" /> {t("dev.authBearer")}
            </div>
            <CodeBlock
              code={`Authorization: Bearer <access_token>\nBase URL: ${BASE_URL}\nFormat: application/json\nUpload: multipart/form-data`}
              exampleLabel={t("dev.example")}
              copyLabel={t("dev.copy")}
              copiedLabel={t("dev.copied")}
            />
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-8 sm:px-6 md:grid-cols-4 lg:px-8">
        {[
          { label: t("dev.label.apiVersion"), value: schema?.info?.version ?? "1.0.0", icon: Server },
          { label: t("dev.label.endpoints"),  value: String(endpoints.length), icon: Shield },
          { label: t("dev.label.devLimit"),   value: t("dev.label.devLimitValue"), icon: Timer },
          { label: t("dev.label.pagination"), value: t("dev.label.paginationValue"), icon: Layers },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <Icon className="h-5 w-5 text-[#E04E2F]" />
            <p className="mt-4 text-2xl font-bold text-gray-900">{value}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
          </div>
        ))}
      </section>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 pb-12 sm:px-6 lg:grid-cols-[260px_1fr] lg:px-8">
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            {[
              [t("dev.nav.quickstart"), "#quickstart"],
              [t("dev.nav.auth"),       "#auth"],
              [t("dev.nav.quotas"),     "#quotas"],
              [t("dev.nav.versions"),   "#versions"],
              [t("dev.nav.endpoints"),  "#endpoints"],
              [t("dev.nav.sdk"),        "#sdk"],
              [t("dev.nav.errors"),     "#errors"],
            ].map(([label, href]) => (
              <a key={href} href={href} className="block rounded-xl px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:text-gray-900">
                {label}
              </a>
            ))}
          </div>
        </aside>

        <div className="min-w-0 space-y-6">
          <section id="quickstart" className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{t("dev.quickstartTitle")}</h2>
                <p className="mt-1 text-sm text-gray-500">{t("dev.quickstartDesc")}</p>
              </div>
              <div className="flex rounded-xl bg-gray-100 p-1">
                {(["curl", "python", "javascript"] as Lang[]).map((item) => (
                  <button
                    key={item}
                    onClick={() => setLang(item)}
                    className={cn("rounded-lg px-3 py-1.5 text-xs font-bold capitalize", lang === item ? "bg-white text-[#E04E2F] shadow-sm" : "text-gray-500")}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-5">
              <CodeBlock code={QUICK_START[lang]} exampleLabel={t("dev.example")} copyLabel={t("dev.copy")} copiedLabel={t("dev.copied")} />
            </div>
          </section>

          <section id="auth" className="grid gap-5 md:grid-cols-2">
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <Lock className="h-5 w-5 text-[#E04E2F]" />
              <h2 className="mt-4 text-xl font-bold text-gray-900">{t("dev.authTitle")}</h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                {t("dev.authDesc")}
              </p>
              <div className="mt-4 rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
                <p className="font-bold text-gray-900">{t("dev.authHeader")}</p>
                <p className="mt-1 font-mono text-xs">Authorization: Bearer &lt;access_token&gt;</p>
              </div>
            </div>
              <div id="quotas" className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <Timer className="h-5 w-5 text-[#E04E2F]" />
              <h2 className="mt-4 text-xl font-bold text-gray-900">{t("dev.quotasTitle")}</h2>
              <div className="mt-4 space-y-3 text-sm text-gray-600">
                <p><span className="font-bold text-gray-900">{t("dev.quota.rateLimit")}</span> {t("dev.quota.rateLimitDesc")}</p>
                <p><span className="font-bold text-gray-900">{t("dev.quota.pagination")}</span> {t("dev.quota.paginationDesc")}</p>
                <p><span className="font-bold text-gray-900">{t("dev.quota.upload")}</span> {t("dev.quota.uploadDesc")}</p>
                <p><span className="font-bold text-gray-900">{t("dev.quota.geoBbox")}</span> {t("dev.quota.geoBboxDesc")}</p>
              </div>
            </div>
          </section>

          <section id="versions" className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <Server className="h-5 w-5 text-[#E04E2F]" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{t("dev.versionsTitle")}</h2>
                <p className="mt-1 text-sm text-gray-500">
                  {t("dev.versionsDesc")}
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {API_VERSIONS.map((item) => (
                <div key={item.version} className="rounded-xl border border-gray-100 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-sm font-bold text-gray-900">{item.version}</span>
                    <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600">{item.status}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-gray-600">{item.text}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="endpoints" className="rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 p-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{t("dev.endpointsTitle")}</h2>
                <p className="mt-1 text-sm text-gray-500">
                  {schemaError ? t("dev.endpointsError") : t("dev.endpointsLoaded")}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={loadSchema}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700"
                  disabled={schemaLoading}
                >
                  <RefreshCw className={cn("h-4 w-4", schemaLoading && "animate-spin")} /> {t("dev.sync")}
                </button>
                <a href="/openapi.json" className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700">
                  <Download className="h-4 w-4" /> {t("dev.schema")}
                </a>
              </div>
            </div>
            <div className="flex flex-col gap-3 border-b border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-sm">
                <label htmlFor="endpoint-search" className="sr-only">{t("dev.filterPlaceholder")}</label>
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  id="endpoint-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t("dev.filterPlaceholder")}
                  className="w-full rounded-xl border border-gray-200 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#E04E2F]/20"
                />
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                {tags.slice(0, 6).map((tag) => (
                  <span key={tag} className="rounded-full bg-gray-100 px-2.5 py-1 font-semibold">{tag}</span>
                ))}
              </div>
            </div>
            {schemaError && (
              <div className="mx-6 mt-5 flex gap-3 rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-900">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{t("dev.endpointsSchemaError")}</p>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-400">
                  <tr>
                    <th className="px-5 py-3">{t("dev.tableMethod")}</th>
                    <th className="px-5 py-3">{t("dev.tableEndpoint")}</th>
                    <th className="px-5 py-3">{t("dev.tableTag")}</th>
                    <th className="px-5 py-3">{t("dev.tableAccess")}</th>
                    <th className="px-5 py-3">{t("dev.tableDescription")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredEndpoints.map((endpoint) => (
                    <tr key={`${endpoint.method}-${endpoint.path}`} className="align-top">
                      <td className="px-5 py-3">
                        <span className={cn("rounded-lg px-2 py-1 text-xs font-bold ring-1", METHOD_COLORS[endpoint.method] ?? "bg-gray-50 text-gray-700 ring-gray-100")}>
                          {endpoint.method}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-gray-900">{endpoint.path}</td>
                      <td className="px-5 py-3 text-xs font-semibold text-gray-500">{endpoint.tag ?? "General"}</td>
                      <td className="px-5 py-3">
                        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600">{endpoint.scope}</span>
                      </td>
                      <td className="px-5 py-3 text-gray-600">{endpoint.desc}</td>
                    </tr>
                  ))}
                  {!filteredEndpoints.length && (
                    <tr>
                      <td colSpan={5} className="px-5 py-12 text-center text-sm text-gray-400">
                        {t("dev.noEndpoint")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section id="sdk" className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{t("dev.sdkTitle")}</h2>
                <p className="mt-1 text-sm text-gray-500">{t("dev.sdkDesc")}</p>
              </div>
              <div className="flex rounded-xl bg-gray-100 p-1">
                {(["curl", "python", "javascript"] as Lang[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setLang(item)}
                    className={cn("rounded-lg px-3 py-1.5 text-xs font-bold capitalize", lang === item ? "bg-white text-[#E04E2F] shadow-sm" : "text-gray-500")}
                    aria-pressed={lang === item}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-5">
              <CodeBlock code={SDK_SNIPPETS[lang]} exampleLabel={t("dev.example")} copyLabel={t("dev.copy")} copiedLabel={t("dev.copied")} />
            </div>
          </section>

          <section className="grid gap-5 md:grid-cols-3">
            {[
              { titleKey: "dev.cat.catalogue", icon: Database, textKey: "dev.cat.catalogue.desc" },
              { titleKey: "dev.cat.search",    icon: Search,   textKey: "dev.cat.search.desc" },
              { titleKey: "dev.cat.geo",       icon: Map,      textKey: "dev.cat.geo.desc" },
              { titleKey: "dev.cat.exports",   icon: Download, textKey: "dev.cat.exports.desc" },
              { titleKey: "dev.cat.accounts",  icon: KeyRound, textKey: "dev.cat.accounts.desc" },
              { titleKey: "dev.cat.monitoring",icon: Globe,    textKey: "dev.cat.monitoring.desc" },
            ].map(({ titleKey, icon: Icon, textKey }) => (
              <div key={titleKey} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <Icon className="h-5 w-5 text-[#E04E2F]" />
                <h3 className="mt-4 font-bold text-gray-900">{t(titleKey)}</h3>
                <p className="mt-2 text-sm leading-6 text-gray-600">{t(textKey)}</p>
              </div>
            ))}
          </section>

          <section id="errors" className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900">{t("dev.errorsTitle")}</h2>
            <p className="mt-1 text-sm text-gray-500">{t("dev.errorsDesc")}</p>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {ERROR_CODES.map((error) => (
                <div key={error.code} className="flex gap-3 rounded-xl border border-gray-100 p-4">
                  <span className="flex h-10 w-14 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-sm font-bold text-gray-800">{error.code}</span>
                  <div>
                    <p className="font-bold text-gray-900">{error.label}</p>
                    <p className="mt-1 text-sm text-gray-600">{error.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-green-100 bg-green-50 p-6">
            <div className="flex gap-3">
              <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-700" />
              <div>
                <h2 className="font-bold text-green-950">{t("dev.ready")}</h2>
                <p className="mt-1 text-sm leading-6 text-green-900">
                  {t("dev.readyDesc")}
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
