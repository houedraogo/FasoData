"use client";

import { useState } from "react";
import { Bell, ChevronDown, CheckCircle, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

const COMMODITIES = [
  { key: "sorghum",    label: "Sorgho",    seuil: 320 },
  { key: "rice_local", label: "Riz local", seuil: 500 },
  { key: "rice_imported", label: "Riz importé", seuil: 500 },
  { key: "maize",      label: "Maïs",      seuil: 300 },
  { key: "millet",     label: "Mil",       seuil: 350 },
  { key: "cowpea",     label: "Niébé",     seuil: 650 },
  { key: "groundnut",  label: "Arachide",  seuil: 650 },
];

const REGIONS = [
  "National", "Sahel", "Centre", "Hauts-Bassins",
  "Est", "Nord", "Centre-Nord", "Cascades",
];

type Step = "form" | "success" | "error";

interface Props { onClose?: () => void; }

export default function AlerteSubscribeWidget({ onClose }: Props) {
  const [step, setStep]             = useState<Step>("form");
  const [email, setEmail]           = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [commodity, setCommodity]   = useState("sorghum");
  const [region, setRegion]         = useState("National");
  const [threshold, setThreshold]   = useState("");
  const [loading, setLoading]       = useState(false);
  const [errorMsg, setErrorMsg]     = useState("");

  const activeCom = COMMODITIES.find((c) => c.key === commodity);
  const defaultSeuil = activeCom?.seuil ?? 320;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !threshold) { setErrorMsg("Tous les champs sont requis"); return; }
    const thNum = Number(threshold);
    if (isNaN(thNum) || thNum <= 0) { setErrorMsg("Seuil invalide"); return; }

    setLoading(true);
    setErrorMsg("");

    try {
      const resp = await fetch(`${window.location.origin}/api/alerts/subscribe`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          email,
          whatsapp_number: whatsappNumber.trim() || null,
          commodity,
          region,
          threshold_price: thNum,
        }),
      });
      if (resp.ok || resp.status === 409) {
        setStep("success");
      } else {
        const data = await resp.json().catch(() => ({}));
        setErrorMsg(data.detail ?? "Erreur lors de l'inscription");
        setStep("error");
      }
    } catch {
      setErrorMsg("Impossible de contacter le serveur");
      setStep("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden">
      {/* En-tête */}
      <div className="bg-[#1A2C42] px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#E04E2F] rounded-lg flex items-center justify-center">
            <Bell className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm">Alertes prix</p>
            <p className="text-white/50 text-[10px]">Notification par email + WhatsApp</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 text-white/40 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Corps */}
      <div className="p-5">
        {step === "success" ? (
          <div className="text-center py-4">
            <CheckCircle className="w-10 h-10 text-[#16A34A] mx-auto mb-3" />
            <h3 className="font-bold text-gray-900 mb-2">Demande enregistrée !</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Un email de confirmation a été envoyé à <strong>{email}</strong>.
              Cliquez sur le lien pour activer votre alerte email et WhatsApp.
            </p>
            <button onClick={() => { setStep("form"); setEmail(""); setThreshold(""); }}
              className="mt-4 text-xs text-[#E04E2F] hover:underline">
              Configurer une autre alerte
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Produit
              </label>
              <div className="relative">
                <select value={commodity} onChange={(e) => { setCommodity(e.target.value); setThreshold(""); }}
                  className="w-full appearance-none px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A2C42]/20 bg-white">
                  {COMMODITIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Région
              </label>
              <div className="relative">
                <select value={region} onChange={(e) => setRegion(e.target.value)}
                  className="w-full appearance-none px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A2C42]/20 bg-white">
                  {REGIONS.map((r) => <option key={r}>{r}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Seuil d'alerte (CFA/kg)
              </label>
              <div className="relative">
                <Bell className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  placeholder={`ex: ${defaultSeuil}`}
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E04E2F]/20"
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">
                Seuil recommandé : {defaultSeuil} CFA/kg
              </p>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@organisation.bf"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E04E2F]/20"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                WhatsApp (optionnel)
              </label>
              <input
                type="tel"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="+226 70 11 22 33"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20"
              />
            </div>

            {(errorMsg || step === "error") && (
              <p className="text-xs text-[#E04E2F] bg-red-50 rounded-lg px-3 py-2">{errorMsg}</p>
            )}

            <button type="submit" disabled={loading || !email || !threshold}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#E04E2F] hover:bg-[#c73e22] disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-colors">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
              {loading ? "Inscription…" : "Me prévenir par email + WhatsApp"}
            </button>

            <p className="text-[10px] text-gray-400 text-center leading-relaxed">
              Confirmation par email requise · WhatsApp optionnel · Désabonnement en 1 clic
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
