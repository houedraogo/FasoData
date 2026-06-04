"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Lock, Eye, EyeOff, ArrowLeft, Database,
  CheckCircle, AlertCircle, Loader2,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

// ── Checker de force du mot de passe ─────────────────────────────────────────

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "8 caractères minimum",       ok: password.length >= 8 },
    { label: "Une majuscule",              ok: /[A-Z]/.test(password) },
    { label: "Un chiffre ou symbole",      ok: /[\d!@#$%^&*]/.test(password) },
  ];
  const score = checks.filter((c) => c.ok).length;
  const colors = ["", "bg-red-400", "bg-amber-400", "bg-green-500"];
  const labels = ["", "Faible", "Moyen", "Fort"];

  if (!password) return null;
  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {[1, 2, 3].map((i) => (
          <div key={i} className={cn("flex-1 h-1 rounded-full transition-colors",
            i <= score ? colors[score] : "bg-gray-100")} />
        ))}
      </div>
      <p className={cn("text-[11px] font-medium",
        score === 3 ? "text-green-600" : score === 2 ? "text-amber-600" : "text-red-500")}>
        {labels[score]}
      </p>
      <div className="space-y-0.5">
        {checks.map(({ label, ok }) => (
          <p key={label} className={cn("text-[11px] flex items-center gap-1",
            ok ? "text-green-600" : "text-gray-400")}>
            <span>{ok ? "✓" : "○"}</span> {label}
          </p>
        ))}
      </div>
    </div>
  );
}

// ── Page interne (a besoin de useSearchParams) ────────────────────────────────

function ResetPage() {
  const params = useSearchParams();
  const router = useRouter();
  const token  = params.get("token") ?? "";

  const [password, setPassword]   = useState("");
  const [confirm,  setConfirm]    = useState("");
  const [showPwd,  setShowPwd]    = useState(false);
  const [loading,  setLoading]    = useState(false);
  const [done,     setDone]       = useState(false);
  const [error,    setError]      = useState("");

  // Si pas de token dans l'URL → rediriger immédiatement
  useEffect(() => {
    if (!token) {
      router.replace("/auth/mot-de-passe-oublie");
    }
  }, [token, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Le mot de passe doit faire au moins 8 caractères."); return;
    }
    if (password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas."); return;
    }

    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, new_password: password });
      setDone(true);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail ?? "Lien invalide ou expiré. Refaites une demande de réinitialisation.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) return null; // redirection en cours

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
            <h2 className="text-2xl font-bold text-white mb-4">Nouveau mot de passe</h2>
            <p className="text-white/60 leading-relaxed max-w-sm">
              Choisissez un mot de passe sécurisé d'au moins 8 caractères.
              Il sera chiffré et stocké en toute sécurité.
            </p>
            <div className="mt-6 space-y-3">
              {["8 caractères minimum", "Mélange lettres et chiffres", "Évitez les mots courants"].map((tip) => (
                <div key={tip} className="flex items-center gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E04E2F] shrink-0" />
                  <span className="text-white/50 text-sm">{tip}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="px-10 pb-10">
          <p className="text-white/30 text-xs">Lien à usage unique · Expire 30 min après la demande</p>
        </div>
      </div>

      {/* Panel droit */}
      <div className="flex-1 flex items-center justify-center px-6 sm:px-12">
        <div className="w-full max-w-md">

          <Link href="/auth/connexion"
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 mb-10 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Retour à la connexion
          </Link>

          {done ? (
            /* État succès */
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">
                Mot de passe mis à jour !
              </h1>
              <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                Votre mot de passe a été réinitialisé avec succès.
                Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
              </p>
              <Link
                href="/auth/connexion"
                className="inline-flex items-center justify-center w-full py-3.5 bg-[#1A2C42] hover:bg-[#0f1e30] text-white font-semibold rounded-xl text-sm transition-colors"
              >
                Se connecter →
              </Link>
            </div>
          ) : (
            /* Formulaire */
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Nouveau mot de passe
              </h1>
              <p className="text-gray-500 text-sm mb-8">
                Choisissez un nouveau mot de passe sécurisé pour votre compte FasoData.
              </p>

              {/* Erreur globale */}
              {error && (
                <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-6">
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm text-red-700 font-medium">{error}</p>
                    {error.includes("expiré") && (
                      <Link href="/auth/mot-de-passe-oublie"
                        className="text-xs text-red-600 underline mt-1 inline-block">
                        Refaire une demande →
                      </Link>
                    )}
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">

                {/* Nouveau mot de passe */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Nouveau mot de passe
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                    <input
                      type={showPwd ? "text" : "password"}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(""); }}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      className={cn(
                        "w-full pl-10 pr-10 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-colors",
                        error && !error.includes("expiré")
                          ? "border-red-300 focus:ring-red-100"
                          : "border-gray-200 focus:ring-[#1A2C42]/20 focus:border-[#1A2C42]/30"
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((p) => !p)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <PasswordStrength password={password} />
                </div>

                {/* Confirmation */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Confirmer le mot de passe
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                    <input
                      type={showPwd ? "text" : "password"}
                      value={confirm}
                      onChange={(e) => { setConfirm(e.target.value); setError(""); }}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      className={cn(
                        "w-full pl-10 pr-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-colors",
                        confirm && confirm !== password
                          ? "border-red-300 focus:ring-red-100"
                          : "border-gray-200 focus:ring-[#1A2C42]/20 focus:border-[#1A2C42]/30"
                      )}
                    />
                  </div>
                  {confirm && confirm !== password && (
                    <p className="text-red-500 text-xs mt-1">Les mots de passe ne correspondent pas</p>
                  )}
                  {confirm && confirm === password && password.length >= 8 && (
                    <p className="text-green-600 text-xs mt-1 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Correspondance confirmée
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !password || !confirm || password !== confirm}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#E04E2F] hover:bg-[#c73e22] disabled:opacity-50 text-white font-semibold rounded-xl transition-colors text-sm"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Réinitialisation…</>
                  ) : (
                    "Définir le nouveau mot de passe"
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Export avec Suspense (useSearchParams requiert un Suspense boundary) ───────

export default function ReinitialiserMotDePassePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    }>
      <ResetPage />
    </Suspense>
  );
}
