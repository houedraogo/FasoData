"use client";

import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { RefreshCw, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

function Spark({ data, color }: { data: number[]; color: string }) {
  const pts = data.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width={96} height={36}>
      <AreaChart data={pts} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
        <defs>
          <linearGradient id={`sg${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.18} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5}
          fill={`url(#sg${color.replace("#","")})`} dot={false} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function UptimeBar({ pct, color }: { pct: number; color: string }) {
  const bars = 20;
  const filled = Math.round((pct / 100) * bars);
  return (
    <div className="flex gap-px">
      {Array.from({ length: bars }, (_, i) => (
        <div key={i} className="h-3.5 w-1.5 rounded-sm"
          style={{ background: i < filled ? color : "#E5E7EB" }} />
      ))}
    </div>
  );
}

function ResourceBar({ label, value, detail, color }: { label: string; value: number; detail: string; color: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-800">{label}</span>
        <span className="text-sm font-bold" style={{ color }}>{value}%</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, background: color }} />
      </div>
      <p className="text-xs text-gray-400">{detail}</p>
    </div>
  );
}

const SERVICES = [
  { name: "API REST",          sub: "app.fasodata.bf",             status: "ok",   version: "v1.4.2",       uptime: 99.98, latency: "142ms", color: "#16A34A" },
  { name: "Base PostgreSQL",   sub: "cluster primaire · 3 nœuds",  status: "ok",   version: "15.3",          uptime: 99.99, latency: "8ms",   color: "#16A34A" },
  { name: "PostGIS / SIG",    sub: "extension activée",            status: "ok",   version: "3.4",           uptime: 99.92, latency: "24ms",  color: "#16A34A" },
  { name: "Stockage MinIO",   sub: "4.2 To utilisés / 10 To",      status: "ok",   version: "S3-comp.",      uptime: 100,   latency: "18ms",  color: "#16A34A" },
  { name: "Elasticsearch",    sub: "CPU élevé sur node-2",         status: "warn", version: "8.11",          uptime: 99.87, latency: "62ms",  color: "#D97706" },
  { name: "Service emails",   sub: "sendgrid.com",                 status: "ok",   version: "SMTP",          uptime: 99.95, latency: "240ms", color: "#16A34A" },
  { name: "Worker imports",   sub: "queue: 12 jobs",               status: "ok",   version: "4 actifs",      uptime: 100,   latency: "—",     color: "#16A34A" },
  { name: "Sauvegardes auto", sub: "dernière: il y a 6h · OK",     status: "ok",   version: "quotidiennes",  uptime: 100,   latency: "—",     color: "#16A34A" },
];

const RESOURCES = [
  { label: "CPU",            value: 48, detail: "4 vCPU · 8 cœurs",  color: "#16A34A" },
  { label: "Mémoire",        value: 62, detail: "9.9 Go / 16 Go",    color: "#16A34A" },
  { label: "Stockage BDD",   value: 71, detail: "142 Go / 200 Go",   color: "#D97706" },
  { label: "Stockage objet", value: 42, detail: "4.2 To / 10 To",   color: "#16A34A" },
  { label: "Bande passante", value: 35, detail: "350 Mbps / 1 Gbps", color: "#16A34A" },
  { label: "Connexions DB",  value: 28, detail: "56 / 200",          color: "#16A34A" },
];

const EVENTS = [
  { time: "14:32:18", level: "WARN", module: "elasticsearch", msg: "CPU node-2 > 80% pendant 5 min",                           user: "—" },
  { time: "14:28:04", level: "INFO", module: "auth",           msg: "Nouvel utilisateur invité : k.bocoum@ext.fasodata.bf",     user: "rasmane" },
  { time: "14:15:42", level: "INFO", module: "api",            msg: "GET /v1/datasets · 200 · 142ms",                           user: "aceedo-bot" },
];

const KPIS = [
  { label: "UPTIME 30J",          value: "99.94", unit: "%",  sub: "objectif 99.5%",   color: "#16A34A", spark: [100,99.8,100,99.5,100,100,99.9,100,99.94] },
  { label: "TEMPS RÉPONSE API",   value: "142",   unit: "ms", sub: "cible < 200 ms",   color: "#16A34A", spark: [180,165,152,148,145,160,138,142,142] },
  { label: "REQUÊTES / H",        value: "8.2k",  unit: "",   sub: "+12% vs hier",     color: "#1A2C42", spark: [5200,6100,6800,7200,7500,7800,8000,8100,8200] },
  { label: "ERREURS 5XX",         value: "0.03",  unit: "%",  sub: "cible ≤ 0.5%",     color: "#D97706", spark: [0.08,0.05,0.04,0.06,0.03,0.05,0.02,0.04,0.03] },
];

export default function SupervisionPage() {
  return (
    <div className="p-6 lg:p-8 space-y-6">

      {/* En-tête */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <span className="flex items-center gap-2 text-xs font-semibold text-[#16A34A] bg-green-50 border border-green-100 px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-[#16A34A] rounded-full animate-pulse" />
              Tous systèmes opérationnels
            </span>
            <span className="text-sm text-gray-400">Dernière vérification il y a 12s</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Supervision technique</h1>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 bg-white transition-colors">
            <RefreshCw className="w-4 h-4" /> Actualiser
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 bg-white transition-colors">
            <Settings className="w-4 h-4" /> Configurer alertes
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {KPIS.map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">{kpi.label}</p>
            <div className="flex items-end justify-between gap-2">
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold" style={{ color: kpi.color }}>{kpi.value}</span>
                  {kpi.unit && <span className="text-sm text-gray-400 font-medium ml-0.5">{kpi.unit}</span>}
                </div>
                <p className="text-xs text-gray-400 mt-1">{kpi.sub}</p>
              </div>
              <Spark data={kpi.spark} color={kpi.color} />
            </div>
          </div>
        ))}
      </div>

      {/* Services + Ressources */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Services */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <span className="w-1 h-4 bg-[#E04E2F] rounded-full" />
            <h2 className="font-bold text-gray-900 text-sm">Services & infrastructure</h2>
            <span className="text-xs text-gray-400 ml-1">État en temps réel</span>
          </div>
          <div className="divide-y divide-gray-50">
            {SERVICES.map((svc) => (
              <div key={svc.name}
                className="grid items-center gap-4 px-5 py-3"
                style={{ gridTemplateColumns: "12px 1fr auto auto auto auto" }}>
                <div className={cn("w-2 h-2 rounded-full",
                  svc.status === "ok" ? "bg-[#16A34A]" : "bg-[#D97706] animate-pulse")} />
                <div>
                  <p className="text-sm font-medium text-gray-900">{svc.name}</p>
                  <p className="text-[10px] text-gray-400">{svc.sub}</p>
                </div>
                <span className="text-[10px] font-mono bg-gray-100 text-gray-600 px-2 py-1 rounded-lg whitespace-nowrap">
                  {svc.version}
                </span>
                <span className="text-sm font-semibold text-gray-700 w-14 text-right">
                  {svc.uptime}%
                </span>
                <span className="text-xs text-gray-400 w-12 text-right">{svc.latency}</span>
                <UptimeBar pct={svc.uptime} color={svc.color} />
              </div>
            ))}
          </div>
        </div>

        {/* Ressources serveur */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-5">
            <span className="w-1 h-4 bg-[#E04E2F] rounded-full" />
            <h2 className="font-bold text-gray-900 text-sm">Ressources serveur</h2>
            <span className="text-xs text-gray-400">Charge actuelle</span>
          </div>
          <div className="space-y-5">
            {RESOURCES.map((r) => <ResourceBar key={r.label} {...r} />)}
          </div>
        </div>
      </div>

      {/* Journal d'événements */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <span className="w-1 h-4 bg-[#1A2C42] rounded-full" />
          <h2 className="font-bold text-gray-900 text-sm">Journal d'événements</h2>
          <span className="text-xs text-gray-400 ml-1">Dernières 24h · 1 423 événements</span>
        </div>
        <div className="font-mono text-xs divide-y divide-gray-50">
          {EVENTS.map((e, i) => (
            <div key={i} className="grid items-center gap-4 px-5 py-3 hover:bg-gray-50/60"
              style={{ gridTemplateColumns: "80px 60px 120px 1fr 100px" }}>
              <span className="text-gray-500">{e.time}</span>
              <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold text-center",
                e.level === "WARN" ? "bg-amber-100 text-amber-700" : "bg-blue-50 text-blue-600")}>
                {e.level}
              </span>
              <span className="text-gray-500">{e.module}</span>
              <span className="text-gray-700 font-sans truncate">{e.msg}</span>
              <span className="text-gray-400 text-right">{e.user}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
