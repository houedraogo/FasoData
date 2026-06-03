"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, Database, CheckCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MotDePasseOubliePage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) { setError("Adresse email invalide"); return; }
    setError("");
    setLoading(true);
    // Simulation — pas d'endpoint de réinitialisation implémenté côté backend
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    setSent(true);
  };

  return (
    <div className="min-h-screen flex bg-white">

      {/* Panel gauche */}
      <div
        className="hidden lg:flex lg:w-[42%] flex-col relative overflow-hidden"
        style={{
          background: "#1A2C42",
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      >
        <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#F5A623] via-[#E04E2F] to-[#F5A623]" />
        <div className="px-10 pt-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#E04E2F] rounded-xl flex items-center justify-center shadow-lg">
              <Database className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold text-xl tracking-tight">FasoData</span>
          </div>
        </div>
        <div className="flex-1 flex items-center px-10">
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">Récupération de compte</h2>
            <p className="text-white/60 leading-relaxed max-w-sm">
              Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
            </p>
          </div>
        </div>
        <div className="px-10 pb-10">
          <p className="text-white/30 text-xs">Lien valable 30 minutes · Connexion sécurisée</p>
        </div>
      </div>

      {/* Panel droit */}
      <div className="flex-1 flex items-center justify-center px-6 sm:px-12">
        <div className="w-full max-w-md">

          {/* Retour */}
          <Link href="/auth/connexion"
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 mb-10 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Retour à la connexion
          </Link>

          {sent ? (
            /* État succès */
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">Email envoyé !</h1>
              <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                Si un compte correspond à <strong>{email}</strong>, vous recevrez un lien de réinitialisation dans quelques minutes.
              </p>
              <p className="text-xs text-gray-400 mb-8">
                Vérifiez également vos spams si vous ne le trouvez pas dans votre boîte de réception.
              </p>
              <Link href="/auth/connexion"
                className="inline-flex items-center justify-center w-full py-3.5 bg-[#1A2C42] hover:bg-[#0f1e30] text-white font-semibold rounded-xl text-sm transition-colors">
                Retour à la connexion
              </Link>
            </div>
          ) : (
            /* Formulaire */
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Mot de passe oublié ?</h1>
              <p className="text-gray-500 text-sm mb-8">
                Pas de panique. Entrez votre email et nous vous enverrons un lien de réinitialisation.
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Adresse email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(""); }}
                      placeholder="votre@email.bf"
                      className={cn(
                        "w-full pl-10 pr-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-colors",
                        error
                          ? "border-red-300 focus:ring-red-100"
                          : "border-gray-200 focus:ring-[#1A2C42]/20 focus:border-[#1A2C42]/30"
                      )}
                    />
                  </div>
                  {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
                </div>

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#E04E2F] hover:bg-[#c73e22] disabled:opacity-50 text-white font-semibold rounded-xl transition-colors text-sm"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Envoi en cours…</>
                  ) : (
                    "Envoyer le lien de réinitialisation"
                  )}
                </button>
              </form>

              <p className="text-center text-xs text-gray-400 mt-8">
                Vous vous souvenez de votre mot de passe ?{" "}
                <Link href="/auth/connexion" className="text-[#E04E2F] hover:underline font-medium">
                  Se connecter
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
