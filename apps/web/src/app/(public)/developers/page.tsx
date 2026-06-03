"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Activity,
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
  Search,
  Shield,
  Terminal,
  Timer,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Lang = "curl" | "python" | "javascript";

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

const ENDPOINTS = [
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

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-700 bg-[#0F172A]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
        <span className="text-xs font-semibold text-slate-300">Exemple</span>
        <button className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold text-white">
          <Copy className="h-3.5 w-3.5" /> Copier
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-sm leading-6 text-slate-100">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function DevelopersPage() {
  const [lang, setLang] = useState<Lang>("curl");

  return (
    <div className="bg-[#F6F8FB] text-gray-900">
      <section className="border-b border-slate-800 bg-[#101827] text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.1fr_.9fr] lg:px-8 lg:py-16">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80 ring-1 ring-white/10">
              <Activity className="h-3.5 w-3.5 text-[#E04E2F]" />
              FasoData Developers
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
              API de donnees ouvertes pour le Burkina Faso
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">
              Consultez le catalogue, interrogez les donnees geographiques, automatisez les imports et lancez des exports depuis vos outils terrain, SIG ou tableaux de bord.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#quickstart" className="inline-flex items-center gap-2 rounded-xl bg-[#E04E2F] px-5 py-3 text-sm font-bold text-white">
                <Terminal className="h-4 w-4" /> Demarrer
              </a>
              <Link href="/docs" className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-5 py-3 text-sm font-bold text-white/90">
                <BookOpen className="h-4 w-4" /> OpenAPI
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-2xl">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-300">
              <KeyRound className="h-4 w-4 text-[#E04E2F]" /> Authentification Bearer
            </div>
            <CodeBlock code={`Authorization: Bearer <access_token>\nBase URL: ${BASE_URL}\nFormat: application/json\nUpload: multipart/form-data`} />
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-8 sm:px-6 md:grid-cols-4 lg:px-8">
        {[
          { label: "Disponibilite cible", value: "99.5%", icon: Shield },
          { label: "Limite dev", value: "30 req/s", icon: Timer },
          { label: "Pagination max", value: "100 lignes", icon: Layers },
          { label: "Formats", value: "JSON, CSV", icon: Braces },
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
              ["Quickstart", "#quickstart"],
              ["Authentification", "#auth"],
              ["Quotas", "#quotas"],
              ["Endpoints", "#endpoints"],
              ["Erreurs", "#errors"],
            ].map(([label, href]) => (
              <a key={href} href={href} className="block rounded-xl px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:text-gray-900">
                {label}
              </a>
            ))}
          </div>
        </aside>

        <div className="space-y-6">
          <section id="quickstart" className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Demarrage rapide</h2>
                <p className="mt-1 text-sm text-gray-500">Authentifiez-vous puis listez les datasets publics.</p>
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
              <CodeBlock code={QUICK_START[lang]} />
            </div>
          </section>

          <section id="auth" className="grid gap-5 md:grid-cols-2">
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <Lock className="h-5 w-5 text-[#E04E2F]" />
              <h2 className="mt-4 text-xl font-bold text-gray-900">Authentification</h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                L'API utilise OAuth2 password flow. Le endpoint `/api/auth/login` retourne un `access_token` pour les appels API et un `refresh_token` pour renouveler la session.
              </p>
              <div className="mt-4 rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
                <p className="font-bold text-gray-900">Header requis</p>
                <p className="mt-1 font-mono text-xs">Authorization: Bearer &lt;access_token&gt;</p>
              </div>
            </div>
            <div id="quotas" className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <Timer className="h-5 w-5 text-[#E04E2F]" />
              <h2 className="mt-4 text-xl font-bold text-gray-900">Quotas & limites</h2>
              <div className="mt-4 space-y-3 text-sm text-gray-600">
                <p><span className="font-bold text-gray-900">Rate limit dev :</span> 30 requetes/seconde, burst 50 via Nginx.</p>
                <p><span className="font-bold text-gray-900">Pagination :</span> `page_size` entre 1 et 100 selon les listes.</p>
                <p><span className="font-bold text-gray-900">Upload :</span> taille maximale proxy 50 Mo.</p>
                <p><span className="font-bold text-gray-900">Geo bbox :</span> limite maximale 5 000 features.</p>
              </div>
            </div>
          </section>

          <section id="endpoints" className="rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 p-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Reference endpoints</h2>
                <p className="mt-1 text-sm text-gray-500">Routes actuellement exposees par le backend FasoData.</p>
              </div>
              <div className="flex gap-2">
                <Link href="/openapi.json" className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700">
                  <Download className="h-4 w-4" /> Schema
                </Link>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-400">
                  <tr>
                    <th className="px-5 py-3">Methode</th>
                    <th className="px-5 py-3">Endpoint</th>
                    <th className="px-5 py-3">Acces</th>
                    <th className="px-5 py-3">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {ENDPOINTS.map((endpoint) => (
                    <tr key={`${endpoint.method}-${endpoint.path}`} className="align-top">
                      <td className="px-5 py-3">
                        <span className={cn("rounded-lg px-2 py-1 text-xs font-bold ring-1", METHOD_COLORS[endpoint.method] ?? "bg-gray-50 text-gray-700 ring-gray-100")}>
                          {endpoint.method}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-gray-900">{endpoint.path}</td>
                      <td className="px-5 py-3">
                        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600">{endpoint.scope}</span>
                      </td>
                      <td className="px-5 py-3 text-gray-600">{endpoint.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid gap-5 md:grid-cols-3">
            {[
              { title: "Catalogue", icon: Database, text: "Filtrez par categorie, statut et texte libre avec pagination standard." },
              { title: "Recherche", icon: Search, text: "Interrogez Meilisearch sur tous les datasets indexes ou un dataset cible." },
              { title: "Geospatial", icon: Map, text: "Recuperez des FeatureCollections par bbox et les centroides PostGIS." },
              { title: "Exports", icon: Download, text: "Lancez des exports CSV asynchrones et suivez les taches Celery." },
              { title: "Comptes", icon: KeyRound, text: "Gerez inscription, login, refresh token et profil utilisateur." },
              { title: "Monitoring", icon: Globe, text: "Healthcheck public et metriques Prometheus disponibles cote API." },
            ].map(({ title, icon: Icon, text }) => (
              <div key={title} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <Icon className="h-5 w-5 text-[#E04E2F]" />
                <h3 className="mt-4 font-bold text-gray-900">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-gray-600">{text}</p>
              </div>
            ))}
          </section>

          <section id="errors" className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900">Erreurs API</h2>
            <p className="mt-1 text-sm text-gray-500">Les erreurs suivent le format FastAPI standard avec un champ `detail`.</p>
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
                <h2 className="font-bold text-green-950">Pret pour developers.fasodata.bf</h2>
                <p className="mt-1 text-sm leading-6 text-green-900">
                  Cette page peut etre servie sous `/developers` ou mappee sur le sous-domaine `developers.fasodata.bf` par le reverse proxy.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
