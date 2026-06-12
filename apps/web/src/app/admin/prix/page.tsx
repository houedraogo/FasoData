"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MessageSquare, CheckCircle, XCircle, AlertTriangle,
  RefreshCw, Send, Play, Clock, Database,
  Smartphone, Copy, Phone, ChevronRight, Info,
  BarChart3, Shield, Zap,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ATStatus { at_configured: boolean; at_sandbox: boolean; at_username: string; api_key_set: boolean; note: string; webhook_url: string; sms_format: string; produits_reconnus: string[]; }
interface SmsRecord { id: string; commodity: string; region: string; price: number; price_date: string; reporter: string | null; notes: string | null; created_at: string; validation_status: string; anomaly_score: number | null; validated_by: string | null; }
interface ValidationQueue { items: SmsRecord[]; total: number; counts: Record<string, number>; }

const COMMODITY_LABELS: Record<string, string> = {
  sorghum: "Sorgho", rice_local: "Riz local", rice_imported: "Riz importé", maize: "Maïs",
  millet: "Mil", cowpea: "Niébé", groundnut: "Arachide",
};

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  pending:    { label: "En attente",  color: "text-amber-700",  bg: "bg-amber-100",  icon: Clock },
  validated:  { label: "Validé",      color: "text-green-700",  bg: "bg-green-100",  icon: CheckCircle },
  rejected:   { label: "Rejeté",      color: "text-red-600",    bg: "bg-red-100",    icon: XCircle },
  aggregated: { label: "Agrégé",      color: "text-blue-700",   bg: "bg-blue-100",   icon: Database },
  auto:       { label: "Auto",        color: "text-gray-600",   bg: "bg-gray-100",   icon: CheckCircle },
};

const EXAMPLE_MESSAGES = [
  "SORGHO SAHEL 285", "RIZ BOBO 520", "MAIS OUAGA 302",
  "MIL NORD 350",     "NIEBE EST 650","ARACHIDE CENTRE 620",
];

type Tab = "validation" | "aggregation" | "sms_test";

// ── Page principale ───────────────────────────────────────────────────────────

export default function AdminPrixPage() {
  const qc = useQueryClient();

  const [tab, setTab]                       = useState<Tab>("validation");
  const [filterStatus, setFilterStatus]     = useState("pending");
  const [selected, setSelected]             = useState<Set<string>>(new Set());
  const [simulMsg, setSimulMsg]             = useState("SORGHO SAHEL 285");
  const [simulFrom, setSimulFrom]           = useState("+22670000001");
  const [simulResult, setSimulResult]       = useState<{ status: string; commodity?: string; region?: string; price?: number } | null>(null);
  const [testPhone, setTestPhone]           = useState("+22670000001");
  const [testMsg, setTestMsg]               = useState("Message test FasoData 🌾");
  const [aggDate, setAggDate]               = useState("");
  const [aggResult, setAggResult]           = useState<Record<string, unknown> | null>(null);

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: atStatus }         = useQuery<ATStatus>({ queryKey: ["at-status"], queryFn: async () => { const { data } = await api.get("/prices/sms/status"); return data; } });
  const { data: queue, isLoading, refetch } = useQuery<ValidationQueue>({
    queryKey: ["validation-queue", filterStatus],
    queryFn: async () => {
      const p = new URLSearchParams({ status: filterStatus, page_size: "50" });
      const { data } = await api.get(`/prices/validation/queue?${p}`);
      return data;
    },
  });
  const { data: aggHistory, refetch: refetchAgg } = useQuery<{ items: SmsRecord[]; total: number }>({
    queryKey: ["agg-history"],
    queryFn: async () => { const { data } = await api.get("/prices/aggregation/history?page_size=20"); return data; },
    enabled: tab === "aggregation",
  });

  // ── Mutations ──────────────────────────────────────────────────────────────
  const validateOne = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: string }) =>
      api.post(`/prices/validation/${id}`, { action }),
    onSuccess: (_, { action }) => {
      toast.success(action === "validate" ? "✅ Relevé validé" : "❌ Relevé rejeté");
      qc.invalidateQueries({ queryKey: ["validation-queue"] });
    },
  });

  const validateBulk = useMutation({
    mutationFn: async (action: string) => {
      await api.post(`/prices/validation/bulk?action=${action}`, Array.from(selected));
    },
    onSuccess: (_, action) => {
      toast.success(`${selected.size} relevés ${action === "validate" ? "validés" : "rejetés"}`);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["validation-queue"] });
    },
  });

  // ── Actions ────────────────────────────────────────────────────────────────
  const toggleSelect = (id: string) =>
    setSelected((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const toggleAll = () =>
    setSelected((prev) =>
      prev.size === queue?.items.length ? new Set() : new Set(queue?.items.map((r) => r.id))
    );

  const simulateWebhook = async () => {
    try {
      const fd = new URLSearchParams();
      fd.append("from", simulFrom); fd.append("to", "+22699000000");
      fd.append("text", simulMsg); fd.append("date", new Date().toISOString());
      fd.append("id", `sim_${Date.now()}`);
      const { data } = await api.post("/prices/sms/at-callback", fd.toString(), {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      setSimulResult(data);
      qc.invalidateQueries({ queryKey: ["validation-queue"] });
      if (data.status === "accepted") toast.success(`✅ ${data.commodity} · ${data.region} · ${data.price} CFA/kg`);
      else toast.error("❌ Format non reconnu");
    } catch { toast.error("Erreur test webhook"); }
  };

  const triggerAggregation = async () => {
    try {
      const p = aggDate ? `?target_date=${aggDate}` : "";
      const { data } = await api.post(`/prices/aggregation/trigger${p}`);
      setAggResult(data);
      toast.success("⚙️ Agrégation lancée — vérifiez les logs Celery");
      setTimeout(() => refetchAgg(), 3000);
    } catch { toast.error("Erreur lancement agrégation"); }
  };

  const sendTestSms = async () => {
    try {
      const { data } = await api.post("/prices/sms/send", { to: testPhone, message: testMsg });
      toast.success(data.status === "simulated" ? `[Sandbox] → ${testPhone}` : `✅ Envoyé → ${testPhone}`);
    } catch { toast.error("Erreur envoi SMS"); }
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(`https://fasodata.bf${atStatus?.webhook_url ?? ""}`);
    toast.success("URL copiée !");
  };

  const counts = queue?.counts ?? {};
  const pendingCount = counts["pending"] ?? 0;

  const TABS: { key: Tab; icon: React.ElementType; label: string; badge?: number }[] = [
    { key: "validation",  icon: Shield,       label: "Validation SMS",   badge: pendingCount },
    { key: "aggregation", icon: BarChart3,     label: "Agrégation nocturne" },
    { key: "sms_test",    icon: MessageSquare, label: "Tests sandbox" },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 overflow-x-hidden">

      {/* En-tête */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">SMS Prix — Africa's Talking</h1>
          <p className="text-gray-500 text-sm mt-1">
            Validation des relevés terrain · Agrégation nocturne · Monitoring
          </p>
        </div>

        {/* Statut AT */}
        <div className={cn("flex w-full items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium sm:w-auto",
          atStatus?.at_configured ? "bg-green-50 border-green-200 text-green-700" : "bg-amber-50 border-amber-200 text-amber-700")}>
          <span className={cn("w-2 h-2 rounded-full", atStatus?.at_configured ? "bg-green-500 animate-pulse" : "bg-amber-500")} />
          {atStatus?.at_configured ? "AT Opérationnel" : "Mode local"}
        </div>
      </div>

      {/* Onglets */}
      <div className="border-b border-gray-100 overflow-x-auto">
        <div className="flex min-w-max gap-1.5 pb-0">
          {TABS.map(({ key, icon: Icon, label, badge }) => (
            <button key={key} onClick={() => setTab(key)}
              className={cn("flex items-center gap-2 px-3 sm:px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap",
                tab === key ? "border-[#1A2C42] text-[#1A2C42] bg-[#1A2C42]/5" : "border-transparent text-gray-500 hover:text-gray-700")}>
              <Icon className="w-4 h-4 shrink-0" />
              {label}
              {badge != null && badge > 0 && (
                <span className="bg-[#E04E2F] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 1 : VALIDATION SMS
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === "validation" && (
        <div className="space-y-5">

          {/* Compteurs par statut */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(["pending","validated","rejected","aggregated"] as const).map((s) => {
              const cfg = STATUS_CFG[s];
              const Icon = cfg.icon;
              return (
                <button key={s} onClick={() => setFilterStatus(s)}
                  className={cn("p-4 rounded-2xl border text-left transition-all",
                    filterStatus === s ? "border-[#1A2C42] bg-[#1A2C42]/5 shadow-sm" : "bg-white border-gray-100 hover:border-gray-200 shadow-sm")}>
                  <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center mb-2", cfg.bg)}>
                    <Icon className={cn("w-4 h-4", cfg.color)} />
                  </div>
                  <div className="text-xl font-bold text-gray-900">{counts[s] ?? 0}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{cfg.label}</div>
                </button>
              );
            })}
          </div>

          {/* Barre actions */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-3 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox"
                  checked={selected.size > 0 && selected.size === queue?.items.length}
                  onChange={toggleAll}
                  className="w-4 h-4 rounded border-gray-300 text-[#1A2C42] focus:ring-[#1A2C42]/20" />
                <span className="text-xs text-gray-500">
                  {selected.size > 0 ? `${selected.size} sélectionné(s)` : "Tout sélectionner"}
                </span>
              </label>

              {selected.size > 0 && (
                <div className="flex items-center gap-2 ml-2">
                  <button onClick={() => validateBulk.mutate("validate")}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition-colors">
                    <CheckCircle className="w-3.5 h-3.5" /> Valider {selected.size}
                  </button>
                  <button onClick={() => validateBulk.mutate("reject")}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white text-xs font-semibold rounded-lg hover:bg-red-600 transition-colors">
                    <XCircle className="w-3.5 h-3.5" /> Rejeter {selected.size}
                  </button>
                </div>
              )}

              <span className="text-xs text-gray-400 ml-auto">
                {queue?.total ?? 0} relevé(s) · filtre: <strong>{STATUS_CFG[filterStatus]?.label}</strong>
              </span>
              <button onClick={() => refetch()} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Actualiser les relevés SMS">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Table */}
            {isLoading ? (
              <div className="divide-y divide-gray-50">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="px-5 py-4 flex items-center gap-4 animate-pulse">
                    <div className="w-4 h-4 bg-gray-100 rounded" />
                    <div className="w-9 h-9 bg-gray-100 rounded-xl" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 bg-gray-100 rounded w-1/3" />
                      <div className="h-3 bg-gray-50 rounded w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !queue?.items?.length ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-300">
                <MessageSquare className="w-10 h-10 mb-3" />
                <p className="text-sm text-gray-400 font-medium">
                  Aucun relevé — statut : {STATUS_CFG[filterStatus]?.label}
                </p>
                <p className="text-xs text-gray-300 mt-1">
                  Utilisez l'onglet "Tests sandbox" pour créer des relevés de test
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {queue.items.map((sms) => {
                  const cfg  = STATUS_CFG[sms.validation_status] ?? STATUS_CFG["auto"];
                  const Icon = cfg.icon;
                  const dt   = new Date(sms.created_at);
                  const isSelected = selected.has(sms.id);

                  return (
                    <div key={sms.id}
                      className={cn("px-5 py-3.5 flex items-center gap-4 transition-colors",
                        isSelected ? "bg-[#1A2C42]/5" : "hover:bg-gray-50/60")}>

                      {/* Checkbox */}
                      <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(sms.id)}
                        className="w-4 h-4 rounded border-gray-300 text-[#1A2C42] focus:ring-[#1A2C42]/20 shrink-0" />

                      {/* Statut icône */}
                      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", cfg.bg)}>
                        <Icon className={cn("w-4 h-4", cfg.color)} />
                      </div>

                      {/* Infos */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-gray-900">
                            {COMMODITY_LABELS[sms.commodity] ?? sms.commodity} · {sms.region}
                          </span>
                          <span className="text-sm font-bold text-[#E04E2F]">{sms.price} CFA/kg</span>
                          {sms.anomaly_score != null && sms.anomaly_score > 30 && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                              <AlertTriangle className="w-3 h-3" />
                              Écart {sms.anomaly_score}%
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5 flex-wrap">
                          <span className="font-mono">{sms.reporter ?? "inconnu"}</span>
                          <span>·</span>
                          <span>{dt.toLocaleDateString("fr-FR")} {dt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                          {sms.validated_by && (
                            <><span>·</span><span>par {sms.validated_by}</span></>
                          )}
                        </div>
                      </div>

                      {/* Statut badge */}
                      <span className={cn("text-[10px] font-semibold px-2.5 py-1 rounded-full shrink-0", cfg.bg, cfg.color)}>
                        {cfg.label}
                      </span>

                      {/* Actions (seulement pour pending) */}
                      {sms.validation_status === "pending" && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => validateOne.mutate({ id: sms.id, action: "validate" })}
                            disabled={validateOne.isPending}
                            className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors" title="Valider">
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => validateOne.mutate({ id: sms.id, action: "reject" })}
                            disabled={validateOne.isPending}
                            className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors" title="Rejeter">
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 2 : AGRÉGATION NOCTURNE
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === "aggregation" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Panel explication */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-8 h-8 bg-[#1A2C42] rounded-xl flex items-center justify-center">
                  <Zap className="w-4 h-4 text-[#F5A623]" />
                </div>
                <h2 className="font-bold text-gray-900">Celery Beat — 23h00 WAT</h2>
              </div>

              <div className="space-y-4 text-sm text-gray-600">
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <p className="font-semibold text-gray-800">Algorithme d'agrégation :</p>
                  {[
                    "1. Récupère tous les SMS validés du jour",
                    "2. Groupe par (produit, région)",
                    "3. Calcule moyenne, min, max, écart-type",
                    "4. Insère un enregistrement agrégé (source=aggregated)",
                    "5. Marque les SMS sources comme agrégés",
                  ].map((s) => <p key={s} className="text-xs text-gray-500">{s}</p>)}
                </div>

                <div className="bg-amber-50 rounded-xl p-4">
                  <p className="font-semibold text-amber-800 mb-1">Auto-validation des SMS entrants :</p>
                  <p className="text-xs text-amber-700">
                    À la réception, Celery compare le prix au historique des 30 derniers jours.
                    Si l'écart est ≤ 40% → <strong>validé automatiquement</strong>.
                    Sinon → <strong>pending</strong> (revue admin requise dans l'onglet Validation).
                  </p>
                </div>
              </div>
            </div>

            {/* Déclenchement manuel */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-bold text-gray-900 mb-5 flex items-center gap-2">
                <Play className="w-4 h-4 text-[#E04E2F]" />
                Déclencher manuellement
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Date cible (défaut : aujourd'hui)
                  </label>
                  <input type="date" value={aggDate} onChange={(e) => setAggDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A2C42]/20" />
                </div>

                <button onClick={triggerAggregation}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-[#1A2C42] hover:bg-[#0f1e30] text-white font-semibold rounded-xl text-sm transition-colors">
                  <Play className="w-4 h-4" />
                  Lancer l'agrégation maintenant
                </button>

                {aggResult && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-xs">
                    <p className="font-semibold text-green-800 mb-2">Tâche Celery soumise :</p>
                    <pre className="text-green-700 whitespace-pre-wrap">
                      {JSON.stringify(aggResult, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Historique des agrégations */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-[#1A2C42]" />
                <h2 className="font-bold text-gray-900">Enregistrements agrégés</h2>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                  {aggHistory?.total ?? 0} total
                </span>
              </div>
              <button onClick={() => refetchAgg()} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Actualiser les agrégations">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {!aggHistory?.items?.length ? (
              <div className="py-16 text-center text-gray-400">
                <Database className="w-8 h-8 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Aucun enregistrement agrégé</p>
                <p className="text-xs text-gray-300 mt-1">
                  L'agrégation s'exécute automatiquement à 23h00 WAT
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50 font-mono text-xs">
                {aggHistory.items.map((r) => (
                  <div key={r.id} className="px-5 py-3 flex items-center gap-4 hover:bg-gray-50/60">
                    <span className="text-gray-400 w-24 shrink-0">{r.price_date}</span>
                    <span className="font-semibold text-gray-800 w-28 font-sans shrink-0">
                      {COMMODITY_LABELS[r.commodity] ?? r.commodity}
                    </span>
                    <span className="text-gray-500 w-24 font-sans shrink-0">{r.region}</span>
                    <span className="font-bold text-[#1A2C42]">{r.price} CFA/kg</span>
                    <span className="text-gray-400 flex-1 truncate font-sans">{r.notes}</span>
                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[10px] font-bold font-sans shrink-0">
                      agrégé
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 3 : TESTS & SIMULATEUR
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === "sms_test" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Simulateur webhook entrant */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#E04E2F]" />
              Simulateur sandbox de SMS entrant
            </h2>
            <p className="text-xs text-gray-400 mb-5">
              Outil admin de test : simule un POST Africa's Talking vers le webhook, sans SIM requise.
            </p>

            {/* Exemples rapides */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              {EXAMPLE_MESSAGES.map((ex) => (
                <button key={ex} onClick={() => { setSimulMsg(ex); setSimulResult(null); }}
                  className={cn("px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-colors",
                    simulMsg === ex ? "bg-[#1A2C42] text-white border-[#1A2C42]" : "bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300")}>
                  {ex}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={simulFrom} onChange={(e) => setSimulFrom(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A2C42]/20"
                  placeholder="+22670000001" />
              </div>
              <input value={simulMsg} onChange={(e) => { setSimulMsg(e.target.value); setSimulResult(null); }}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1A2C42]/20 uppercase"
                placeholder="SORGHO SAHEL 285" />
              <button onClick={simulateWebhook}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#E04E2F] hover:bg-[#c73e22] text-white font-semibold rounded-xl text-sm">
                <MessageSquare className="w-4 h-4" />
                Injecter un SMS de test
              </button>
            </div>

            {simulResult && (
              <div className={cn("mt-4 p-4 rounded-xl border text-xs",
                simulResult.status === "accepted" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200")}>
                <div className="flex items-center gap-2 mb-2 font-semibold">
                  {simulResult.status === "accepted"
                    ? <><CheckCircle className="w-4 h-4 text-green-600" /> Relevé accepté</>
                    : <><XCircle className="w-4 h-4 text-red-600" /> Format rejeté</>}
                </div>
                {simulResult.status === "accepted" && (
                  <div className="text-gray-600 space-y-0.5">
                    <div>Produit : <strong>{COMMODITY_LABELS[simulResult.commodity ?? ""] ?? simulResult.commodity}</strong></div>
                    <div>Région : <strong>{simulResult.region}</strong></div>
                    <div>Prix : <strong>{simulResult.price} CFA/kg</strong></div>
                    <div className="text-amber-600 mt-1">Auto-validation Celery en cours (5s)…</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Envoi SMS sortant + config AT */}
          <div className="space-y-5">
            {/* Envoi test */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Send className="w-4 h-4 text-[#1A2C42]" />
                Envoyer un SMS de test
              </h2>
              <div className="space-y-3">
                <div className="relative">
                  <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input value={testPhone} onChange={(e) => setTestPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A2C42]/20"
                    placeholder="+22670000001" />
                </div>
                <textarea value={testMsg} onChange={(e) => setTestMsg(e.target.value)} rows={3}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A2C42]/20 resize-none" />
                <button onClick={sendTestSms}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#1A2C42] hover:bg-[#0f1e30] text-white font-semibold rounded-xl text-sm transition-colors">
                  <Send className="w-4 h-4" />
                  {atStatus?.at_configured ? "Envoyer via AT" : "Simuler l'envoi"}
                </button>
              </div>
            </div>

            {/* Config AT */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Info className="w-4 h-4 text-[#1A2C42]" />
                Configuration Africa's Talking
              </h2>
              <div className="space-y-3 text-sm">
                {[
                  { label: "Utilisateur", value: atStatus?.at_username ?? "—" },
                  { label: "Clé API",     value: atStatus?.api_key_set ? "✅ Définie" : "❌ Manquante (mode local)" },
                  { label: "Mode",        value: atStatus?.at_sandbox ? "Sandbox (gratuit)" : "Production" },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                    <span className="text-gray-500">{label}</span>
                    <span className="font-medium text-gray-800 text-xs">{value}</span>
                  </div>
                ))}

                {/* Webhook URL */}
                <div className="flex items-center gap-2 bg-gray-50 rounded-lg border border-gray-200 px-3 py-2">
                  <code className="text-xs text-gray-600 flex-1 truncate">
                    https://fasodata.bf{atStatus?.webhook_url}
                  </code>
                  <button onClick={copyUrl} className="p-1 text-gray-400 hover:text-[#1A2C42] shrink-0" aria-label="Copier l'URL webhook">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[10px] text-gray-400">
                  AT Dashboard → SMS → Incoming Messages → Callback URL
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
