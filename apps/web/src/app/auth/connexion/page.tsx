"use client";

export const dynamic = "force-dynamic";

import Image from "next/image";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Mail, ArrowRight, Loader2, Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import toast from "react-hot-toast";
import { GoogleButton } from "@/components/auth/GoogleButton";

const loginSchema = z.object({
  email:    z.string().email("Email invalide"),
  password: z.string().min(1, "Requis"),
  remember: z.boolean().optional(),
});

type LoginData = z.infer<typeof loginSchema>;

function ConnexionInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { login }    = useAuth();
  const [showPwd, setShowPwd] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginData>({ resolver: zodResolver(loginSchema) });

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
        <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#F5A623] via-[#E04E2F] to-[#F5A623]" />

        <div className="px-10 pt-10 flex items-center gap-3">
          <Image src="/picto.png" alt="" width={40} height={40} className="w-10 h-10 rounded-xl object-cover shrink-0" priority />
          <span className="text-white font-bold text-xl tracking-tight">FasoData</span>
        </div>

        <div className="flex-1 flex flex-col items-start justify-center px-10">
          <blockquote className="text-3xl font-light text-white leading-relaxed mb-10">
            "Nos programmes{" "}
            <em className="not-italic font-bold text-[#E04E2F]">pilotés sur la donnée</em>
            , en quelques clics."
          </blockquote>

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

      {/* ── Formulaire connexion ── */}
      <div className="flex-1 flex flex-col justify-center px-10 py-12 max-w-md mx-auto w-full">
        <div className="hidden lg:flex items-center justify-end gap-4 mb-12 text-sm text-gray-400">
          <span>
            Besoin d'aide ?{" "}
            <a href="/contact" className="text-[#E04E2F] hover:underline font-medium">
              Centre d'assistance →
            </a>
          </span>
          <span className="text-gray-300">|</span>
          <span className="font-semibold text-gray-700" title="L'authentification FasoData est disponible en français.">
            FR
          </span>
        </div>

        <div className="flex gap-6 mb-8 border-b border-gray-100">
          <button className="pb-3 text-sm font-semibold text-[#E04E2F] border-b-2 border-[#E04E2F] -mb-px">
            Connexion
          </button>
          <Link href="/auth/inscription" className="pb-3 text-sm font-medium text-gray-400 hover:text-gray-600">
            Demande d'accès
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Bienvenue.</h1>
        <p className="text-gray-500 text-sm mb-8">
          Connectez-vous pour accéder à vos espaces de travail et tableaux de bord.
        </p>

        {/* SSO Google */}
        <GoogleButton />

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-gray-100" />
          <span className="text-xs text-gray-400 font-medium">OU</span>
          <div className="flex-1 h-px bg-gray-100" />
        </div>

        <form onSubmit={handleSubmit(onLogin)} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
              <input
                {...register("email")}
                type="email"
                placeholder="nathalie.k@aceedo.bf"
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E04E2F]/20 focus:border-[#E04E2F]/50 transition-colors"
              />
            </div>
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Mot de passe</label>
              <Link href="/auth/mot-de-passe-oublie" className="text-xs text-[#E04E2F] hover:underline">Oublié ?</Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
              <input
                {...register("password")}
                type={showPwd ? "text" : "password"}
                placeholder="••••••••••"
                className="w-full pl-10 pr-11 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E04E2F]/20 focus:border-[#E04E2F]/50"
              />
              <button type="button" onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <input {...register("remember")} type="checkbox"
              className="w-4 h-4 rounded border-gray-300 text-[#E04E2F] focus:ring-[#E04E2F]/20" />
            <span className="text-sm text-gray-600">Se souvenir de moi sur cet appareil</span>
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#E04E2F] hover:bg-[#c73e22] text-white font-semibold rounded-xl transition-colors text-sm"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Se connecter <ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Besoin d'un accès contributeur ?{" "}
          <Link href="/auth/inscription" className="text-[#E04E2F] font-semibold hover:underline">
            Demander un accès →
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ConnexionPage() {
  return (
    <Suspense>
      <ConnexionInner />
    </Suspense>
  );
}
