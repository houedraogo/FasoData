"use client";

export const dynamic = "force-dynamic";

import Image from "next/image";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Eye, EyeOff, Loader2, Building2,
  CheckCircle2, ShieldCheck, Users,
} from "lucide-react";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import axios from "axios";

// ── Schéma de validation ────────────────────────────────────────────────────

const schema = z
  .object({
    full_name: z.string().min(2, "Nom trop court (min. 2 caractères)"),
    email: z.string().email("Adresse email invalide"),
    organization: z.string().min(2, "Nom de l'organisation requis"),
    password: z
      .string()
      .min(8, "8 caractères minimum")
      .regex(/[A-Z]/, "Au moins une majuscule")
      .regex(/[0-9]/, "Au moins un chiffre"),
    confirm_password: z.string(),
  })
  .refine((d) => d.password === d.confirm_password, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirm_password"],
  });

type FormData = z.infer<typeof schema>;

// ── Indicateur de force du mot de passe ─────────────────────────────────────

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "8 caractères", ok: password.length >= 8 },
    { label: "Majuscule", ok: /[A-Z]/.test(password) },
    { label: "Chiffre", ok: /[0-9]/.test(password) },
    { label: "Spécial", ok: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter((c) => c.ok).length;
  const barColor =
    score <= 1 ? "bg-red-400" : score === 2 ? "bg-orange-400" : score === 3 ? "bg-yellow-400" : "bg-green-500";

  if (!password) return null;

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((n) => (
          <div
            key={n}
            className={cn(
              "h-1 flex-1 rounded-full transition-all duration-300",
              n <= score ? barColor : "bg-gray-200"
            )}
          />
        ))}
      </div>
      <div className="flex gap-3 flex-wrap">
        {checks.map((c) => (
          <span
            key={c.label}
            className={cn("text-xs flex items-center gap-1", c.ok ? "text-green-600" : "text-gray-400")}
          >
            <CheckCircle2 className={cn("w-3 h-3", c.ok ? "text-green-500" : "text-gray-300")} />
            {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Page principale ──────────────────────────────────────────────────────────

function InscriptionInner() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const password = watch("password") ?? "";

  const onSubmit = async (data: FormData) => {
    try {
      await api.post("/auth/register", {
        email: data.email,
        full_name: data.full_name,
        organization: data.organization,
        password: data.password,
        role: "institutional",
      });
      toast.success("Demande d'accès envoyée");
      setSubmittedEmail(data.email);
    } catch (err: unknown) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      const detail = axios.isAxiosError(err) ? err.response?.data?.detail : undefined;
      if (status === 409) {
        toast.error("Cette adresse email est déjà utilisée.");
      } else if (typeof detail === "string") {
        toast.error(detail);
      } else {
        toast.error("Une erreur est survenue. Réessayez.");
      }
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* ── Panel gauche (déco) ── */}
      <div className="hidden lg:flex lg:w-5/12 bg-faso-navy flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Blobs décoratifs */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-faso-red/20 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-56 h-56 bg-faso-gold/15 rounded-full blur-3xl" />
        </div>

        <div className="relative text-center space-y-8 max-w-sm">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-12 bg-faso-red rounded-xl flex items-center justify-center shadow-lg shrink-0">
              <Image src="/picto.png" alt="FasoData" width={32} height={32} className="w-8 h-8 object-contain" priority />
            </div>
            <div className="text-left">
              <div className="text-2xl font-bold text-white">FasoData</div>
              <div className="text-white/60 text-xs">Burkina Faso Open Data</div>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white mb-3">
              Rejoignez l'espace contributeur
            </h2>
            <p className="text-white/70 leading-relaxed">
              Le catalogue public reste accessible sans compte. Un accès est nécessaire uniquement pour publier, suivre des programmes et collaborer au nom d'une organisation.
            </p>
          </div>

          {/* Avantages */}
          <div className="space-y-3 text-left">
            {[
              { icon: Users, text: "Catalogue public accessible sans compte" },
              { icon: ShieldCheck, text: "Données fiables et sourcées" },
              { icon: Building2, text: "Publiez vos données institutionnelles" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-white/80">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-faso-gold" />
                </div>
                <span className="text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Panel droit (formulaire) ── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 overflow-y-auto">
        <div className="w-full max-w-lg py-8">

          {/* Logo mobile */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-faso-navy rounded-lg flex items-center justify-center">
                <Image src="/picto.png" alt="FasoData" width={24} height={24} className="w-5 h-5 object-contain" />
              </div>
              <span className="font-bold text-faso-navy text-lg">Faso<span className="font-light text-faso-red">Data</span></span>
            </Link>
          </div>

          <h1 className="text-2xl font-bold text-faso-navy mb-1">Demander un accès contributeur</h1>
          <p className="text-gray-500 text-sm mb-6">
            Déjà membre d'une organisation ?{" "}
            <Link href="/auth/connexion" className="text-faso-red font-medium hover:underline">
              Se connecter
            </Link>
          </p>

          {submittedEmail ? (
            <div className="rounded-2xl border border-green-100 bg-green-50 p-5 text-green-900">
              <CheckCircle2 className="mb-3 h-8 w-8 text-green-600" />
              <h2 className="text-lg font-bold">Demande envoyée</h2>
              <p className="mt-2 text-sm leading-6">
                Votre demande pour <strong>{submittedEmail}</strong> est en attente de validation par un administrateur FasoData.
              </p>
              <button
                type="button"
                onClick={() => router.push("/auth/connexion")}
                className="mt-5 w-full btn-primary justify-center py-3"
              >
                Aller à la connexion
              </button>
            </div>
          ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

            <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900">
              Vous n'avez pas besoin de compte pour consulter ou télécharger les données publiques. Ce formulaire est réservé aux ONG, institutions, universités, entreprises partenaires et administrations qui souhaitent contribuer.
            </div>

            {/* ── Nom complet ── */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Nom complet
              </label>
              <input
                type="text"
                {...register("full_name")}
                placeholder="Prénom Nom"
                className="input-field"
              />
              {errors.full_name && (
                <p className="text-red-500 text-xs mt-1">{errors.full_name.message}</p>
              )}
            </div>

            {/* ── Email ── */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Adresse email
              </label>
              <input
                type="email"
                {...register("email")}
                placeholder="contact@organisation.bf"
                className="input-field"
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
              )}
            </div>

            <div className="transition-all duration-200">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Nom de l'organisation <span className="text-faso-red">*</span>
              </label>
              <input
                type="text"
                {...register("organization")}
                placeholder="Ministère / ONG / Université / Entreprise..."
                className="input-field"
              />
              {errors.organization && (
                <p className="text-red-500 text-xs mt-1">{errors.organization.message}</p>
              )}
            </div>

            {/* ── Mot de passe ── */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  {...register("password")}
                  placeholder="••••••••"
                  className="input-field pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <PasswordStrength password={password} />
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            {/* ── Confirmation mot de passe ── */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Confirmer le mot de passe
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  {...register("confirm_password")}
                  placeholder="••••••••"
                  className="input-field pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirm_password && (
                <p className="text-red-500 text-xs mt-1">{errors.confirm_password.message}</p>
              )}
            </div>

            {/* ── Conditions d'utilisation ── */}
            <p className="text-xs text-gray-500 leading-relaxed">
              En demandant un accès contributeur, vous acceptez les{" "}
              <Link href="/conditions" className="text-faso-red hover:underline">
                conditions d'utilisation
              </Link>{" "}
              et la{" "}
              <Link href="/confidentialite" className="text-faso-red hover:underline">
                politique de confidentialité
              </Link>{" "}
              de FasoData.
            </p>

            {/* ── Bouton submit ── */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full btn-primary justify-center py-3"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Création de l'accès...
                </>
              ) : (
                "Créer mon accès contributeur"
              )}
            </button>
          </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function InscriptionPage() {
  return (
    <Suspense>
      <InscriptionInner />
    </Suspense>
  );
}
