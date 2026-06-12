"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Eye, EyeOff, User, Mail, Building2, Globe,
  ArrowRight, Loader2, Lock,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

// ── Schémas ─────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email:    z.string().email("Email invalide"),
  password: z.string().min(1, "Requis"),
  remember: z.boolean().optional(),
});

const registerSchema = z
  .object({
    firstName:    z.string().min(2, "Requis"),
    lastName:     z.string().min(2, "Requis"),
    email:        z.string().email("Email invalide"),
    organization: z.string().optional(),
    role:         z.enum(["institutional", "public"]),
    password:     z.string().min(8, "8 caractères minimum"),
    confirm:      z.string(),
    rgpd:         z.boolean().refine((v) => v === true, "Requis"),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Mots de passe différents",
    path: ["confirm"],
  });

type LoginData    = z.infer<typeof loginSchema>;
type RegisterData = z.infer<typeof registerSchema>;

// ── Rôles inscription ────────────────────────────────────────────────────────

const ROLES = [
  { value: "public",        label: "Chercheur·euse", icon: User },
  { value: "institutional", label: "Partenaire ONG",  icon: Globe },
  { value: "public",        label: "Institution publique", icon: Building2, sub: "public2" },
  { value: "public",        label: "Citoyen·ne",      icon: User, sub: "public3" },
] as const;

// ── Page ────────────────────────────────────────────────────────────────────

export default function ConnexionPage() {
  const router          = useRouter();
  const searchParams    = useSearchParams();
  const { login }       = useAuth();
  const [showPwd, setShowPwd] = useState(false);
  const [activeRole, setActiveRole] = useState<string>("public");

  // Login form
  const {
    register: regL,
    handleSubmit: handleLogin,
    formState: { errors: lErr, isSubmitting: lLoading },
  } = useForm<LoginData>({ resolver: zodResolver(loginSchema) });

  // Register form
  const {
    register: regR,
    handleSubmit: handleRegister,
    setValue: setRegVal,
    watch: watchReg,
    formState: { errors: rErr, isSubmitting: rLoading },
  } = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: "public" },
  });

  const redirectForRole = (role: "admin" | "institutional" | "public" | undefined) => {
    const next = searchParams.get("next");
    if (role === "admin") {
      router.replace(next?.startsWith("/admin") ? next : "/admin");
    } else if (role === "institutional") {
      router.replace(next?.startsWith("/dashboard") ? next : "/dashboard");
    } else {
      router.replace(next && !next.startsWith("/admin") && !next.startsWith("/dashboard") ? next : "/datasets");
    }
  };

  const onLogin = async (data: LoginData) => {
    try {
      await login(data.email, data.password);
      toast.success("Bienvenue !");
      redirectForRole(useAuth.getState().user?.role);
    } catch {
      toast.error("Email ou mot de passe incorrect");
    }
  };

  const onRegister = async (data: RegisterData) => {
    try {
      await api.post("/auth/register", {
        email:        data.email,
        full_name:    `${data.firstName} ${data.lastName}`,
        organization: data.organization,
        password:     data.password,
        role:         data.role,
      });
      await login(data.email, data.password);
      toast.success("Compte créé avec succès !");
      router.push("/onboarding");
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      toast.error(status === 409 ? "Email déjà utilisé" : "Erreur lors de la création");
    }
  };

  return (
    <div className="min-h-screen flex bg-white overflow-hidden">

      {/* ── Panneau gauche (navy + dot pattern) ── */}
      <div
        className="hidden lg:flex lg:w-[42%] flex-col relative overflow-hidden"
        style={{
          background: "#1A2C42",
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      >
        {/* Barre dorée verticale */}
        <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#F5A623] via-[#E04E2F] to-[#F5A623]" />

        {/* Logo */}
        <div className="px-10 pt-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#E04E2F] rounded-xl flex items-center justify-center shadow-lg">
              <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-white" stroke="currentColor" strokeWidth={2}>
                <path d="M3 17l4-8 4 4 4-6 4 10" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-white font-bold text-xl tracking-tight">FasoData</span>
          </div>
        </div>

        {/* Quote centrale */}
        <div className="flex-1 flex flex-col items-start justify-center px-10">
          <blockquote className="text-3xl font-light text-white leading-relaxed mb-10">
            "Nos programmes{" "}
            <em className="not-italic font-bold text-[#E04E2F]">pilotés sur la donnée</em>
            , en quelques clics."
          </blockquote>

          {/* Témoignage */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#16A34A] flex items-center justify-center text-white font-bold text-sm shrink-0">
              NK
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Nathalie Kaboré</p>
              <p className="text-white/60 text-xs">Coordonnatrice programmes · ACEEDO</p>
            </div>
          </div>
        </div>

        {/* Stats bas */}
        <div className="px-10 pb-10 border-t border-white/10 pt-6 flex gap-10">
          {[
            { value: "1 247", label: "jeux de données" },
            { value: "38",    label: "partenaires" },
            { value: "13",    label: "régions couvertes" },
          ].map(({ value, label }) => (
            <div key={label}>
              <div className="text-2xl font-bold text-white">{value}</div>
              <div className="text-xs text-white/50 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Partie droite (fond blanc) ── */}
      <div className="flex-1 flex">

        {/* Form connexion */}
        <div className="flex-1 flex flex-col justify-center px-10 py-12 max-w-md mx-auto w-full">
          {/* Aide + langue */}
          <div className="hidden lg:flex items-center justify-end gap-4 mb-12 text-sm text-gray-400">
            <span>
              Besoin d'aide ?{" "}
              <a href="#" className="text-[#E04E2F] hover:underline font-medium">
                Centre d'assistance →
              </a>
            </span>
            <span className="text-gray-300">|</span>
            <span>
              <span
                className="font-semibold text-gray-700"
                title="L'authentification FasoData est disponible en français pour cette version."
              >
                FR
              </span>
            </span>
          </div>

          {/* Tabs */}
          <div className="flex gap-6 mb-8 border-b border-gray-100">
            <button className="pb-3 text-sm font-semibold text-[#E04E2F] border-b-2 border-[#E04E2F] -mb-px">
              Connexion
            </button>
            <Link href="/auth/inscription" className="pb-3 text-sm font-medium text-gray-400 hover:text-gray-600">
              Inscription
            </Link>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">Bienvenue.</h1>
          <p className="text-gray-500 text-sm mb-8">
            Connectez-vous pour accéder à vos espaces de travail et tableaux de bord.
          </p>

          <form onSubmit={handleLogin(onLogin)} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                <input
                  {...regL("email")}
                  type="email"
                  placeholder="nathalie.k@aceedo.bf"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E04E2F]/20 focus:border-[#E04E2F]/50 transition-colors"
                />
              </div>
              {lErr.email && <p className="text-red-500 text-xs mt-1">{lErr.email.message}</p>}
            </div>

            {/* Mot de passe */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Mot de passe</label>
                <Link href="/auth/mot-de-passe-oublie" className="text-xs text-[#E04E2F] hover:underline">Oublié ?</Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                <input
                  {...regL("password")}
                  type={showPwd ? "text" : "password"}
                  placeholder="••••••••••"
                  className="w-full pl-10 pr-11 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E04E2F]/20 focus:border-[#E04E2F]/50"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {lErr.password && <p className="text-red-500 text-xs mt-1">{lErr.password.message}</p>}
            </div>

            {/* Remember */}
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input {...regL("remember")} type="checkbox"
                className="w-4 h-4 rounded border-gray-300 text-[#E04E2F] focus:ring-[#E04E2F]/20" />
              <span className="text-sm text-gray-600">Se souvenir de moi sur cet appareil</span>
            </label>

            {/* Submit */}
            <button
              type="submit"
              disabled={lLoading}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#E04E2F] hover:bg-[#c73e22] text-white font-semibold rounded-xl transition-colors text-sm"
            >
              {lLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Se connecter <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          {/* OR */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400 font-medium">OU</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* SSO */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Continuer avec Google",     color: "#4285F4" },
              { label: "Clé France Connect",         color: "#003189" },
            ].map(({ label, color }) => (
              <button key={label}
                className="py-2.5 px-3 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors text-center leading-tight">
                <span className="font-bold" style={{ color }}>•</span>{" "}
                {label}
              </button>
            ))}
          </div>

          {/* Note sécurité */}
          <p className="text-xs text-gray-400 mt-6 leading-relaxed">
            <span className="font-medium">◦</span> Connexion sécurisée par authentification 2FA obligatoire pour tout
            compte avec accès à des données institutionnelles.
          </p>
        </div>

        {/* ── Séparateur ── */}
        <div className="hidden xl:block w-px bg-gray-100 my-12" />

        {/* ── Formulaire inscription (panel droit) ── */}
        <div className="hidden xl:flex flex-1 flex-col justify-center px-10 py-12 max-w-md bg-gray-50/40">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Première visite ?</p>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Créer un compte FasoData</h2>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            L'accès au catalogue Open Data est gratuit et immédiat. Pour les espaces partenaires,
            une vérification est requise.
          </p>

          <form onSubmit={handleRegister(onRegister)} className="space-y-4">
            {/* Prénom + Nom */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Prénom</label>
                <input {...regR("firstName")} type="text" placeholder="Aïcha"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E04E2F]/20 bg-white" />
                {rErr.firstName && <p className="text-red-500 text-xs mt-0.5">{rErr.firstName.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Nom</label>
                <input {...regR("lastName")} type="text" placeholder="Sawadogo"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E04E2F]/20 bg-white" />
                {rErr.lastName && <p className="text-red-500 text-xs mt-0.5">{rErr.lastName.message}</p>}
              </div>
            </div>

            {/* Email pro */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Email professionnel</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
                <input {...regR("email")} type="email" placeholder="vous@organisation.bf"
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E04E2F]/20 bg-white" />
              </div>
              {rErr.email && <p className="text-red-500 text-xs mt-0.5">{rErr.email.message}</p>}
            </div>

            {/* Organisation */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Organisation</label>
              <div className="relative">
                <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
                <input {...regR("organization")} type="text" placeholder="Choisir ou ajouter…"
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E04E2F]/20 bg-white" />
              </div>
            </div>

            {/* Rôle */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Je suis…</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "public",        label: "Chercheur·euse",    icon: User },
                  { value: "institutional", label: "Partenaire ONG",    icon: Globe },
                  { value: "public",        label: "Institution publique", icon: Building2 },
                  { value: "public",        label: "Citoyen·ne",        icon: User },
                ].map(({ value, label, icon: Icon }, i) => {
                  const isActive = i === 0 ? activeRole === "0" : i === 1 ? activeRole === "1" : activeRole === String(i);
                  return (
                    <button
                      key={i} type="button"
                      onClick={() => {
                        setActiveRole(String(i));
                        setRegVal("role", value as "public" | "institutional");
                      }}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium transition-all text-left",
                        activeRole === String(i)
                          ? "border-[#E04E2F] bg-[#E04E2F]/5 text-[#E04E2F]"
                          : "border-gray-200 text-gray-600 hover:border-gray-300 bg-white"
                      )}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* RGPD */}
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input {...regR("rgpd")} type="checkbox"
                className="w-4 h-4 mt-0.5 rounded border-gray-300 text-[#E04E2F] focus:ring-[#E04E2F]/20 shrink-0" />
              <span className="text-xs text-gray-500 leading-relaxed">
                J'accepte les{" "}
                <a href="#" className="text-[#E04E2F] hover:underline">conditions d'utilisation</a>
                {" "}et la{" "}
                <a href="#" className="text-[#E04E2F] hover:underline">politique de confidentialité</a>
                {" "}(RGPD).
              </span>
            </label>
            {rErr.rgpd && <p className="text-red-500 text-xs -mt-2">{rErr.rgpd.message}</p>}

            {/* Submit */}
            <button
              type="submit"
              disabled={rLoading}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#1A2C42] hover:bg-[#0f1e30] text-white font-semibold rounded-xl transition-colors text-sm"
            >
              {rLoading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <>Créer mon compte <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
