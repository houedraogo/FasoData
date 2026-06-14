"use client";

export const dynamic = "force-dynamic";

import Image from "next/image";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Database,
  Droplets,
  FileText,
  GraduationCap,
  HeartPulse,
  Leaf,
  Loader2,
  Map,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import { AuthGate } from "@/components/auth/AuthGate";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const THEMES = [
  { id: "agriculture", icon: Leaf, label: "Agriculture", color: "text-green-600", bg: "bg-green-50", border: "border-green-200" },
  { id: "sante", icon: HeartPulse, label: "Sante", color: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
  { id: "education", icon: GraduationCap, label: "Education", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
  { id: "eau", icon: Droplets, label: "Eau & assainissement", color: "text-cyan-600", bg: "bg-cyan-50", border: "border-cyan-200" },
  { id: "prix", icon: TrendingUp, label: "Prix alimentaires", color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200" },
  { id: "cartographie", icon: Map, label: "Cartographie", color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200" },
  { id: "gouvernance", icon: Building2, label: "Gouvernance", color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-200" },
  { id: "population", icon: Users, label: "Population", color: "text-teal-600", bg: "bg-teal-50", border: "border-teal-200" },
  { id: "securite", icon: ShieldCheck, label: "Securite", color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-200" },
  { id: "finances", icon: FileText, label: "Finances publiques", color: "text-yellow-700", bg: "bg-yellow-50", border: "border-yellow-200" },
  { id: "donnees", icon: Database, label: "Donnees ouvertes", color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-200" },
] as const;

type ThemeId = (typeof THEMES)[number]["id"];
type UserRole = "admin" | "institutional" | "public";

const THEME_TO_DOMAIN: Record<ThemeId, string> = {
  agriculture: "prices",
  sante: "health",
  education: "education",
  eau: "water",
  prix: "prices",
  cartographie: "territory",
  gouvernance: "territory",
  population: "territory",
  securite: "territory",
  finances: "territory",
  donnees: "territory",
};

const DEFAULT_THEME_IDS: ThemeId[] = ["prix", "cartographie", "donnees"];

function routeForRole(role?: UserRole | null) {
  if (role === "admin") return "/admin";
  if (role === "institutional") return "/dashboard";
  return "/datasets";
}

function buildPreferences(themeIds: ThemeId[]) {
  const domains = Array.from(new Set(themeIds.map((theme) => THEME_TO_DOMAIN[theme])));
  const dataTypes = new Set<string>(["datasets"]);

  if (themeIds.some((theme) => ["agriculture", "prix"].includes(theme))) {
    dataTypes.add("time_series");
    dataTypes.add("alerts");
  }

  if (themeIds.some((theme) => ["cartographie", "gouvernance", "population", "securite", "eau"].includes(theme))) {
    dataTypes.add("maps");
  }

  return {
    domains,
    data_types: Array.from(dataTypes),
    regions: ["National"],
  };
}

function OnboardingContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [selected, setSelected] = useState<Set<ThemeId>>(new Set());
  const [saving, setSaving] = useState(false);

  const toggle = (id: ThemeId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const saveAndRedirect = async (themeIds: ThemeId[], successMessage: string) => {
    setSaving(true);
    const destination = routeForRole(user?.role);
    try {
      await api.put("/dashboard/preferences", buildPreferences(themeIds));
      toast.success(successMessage);
    } catch {
      // Préférences non sauvegardées mais on redirige quand même
    } finally {
      setSaving(false);
      router.replace(destination);
    }
  };

  const handleContinue = () => {
    if (!selected.size) return;
    void saveAndRedirect(Array.from(selected), "Preferences enregistrees");
  };

  const handleSkip = () => {
    void saveAndRedirect(DEFAULT_THEME_IDS, "Preferences par defaut appliquees");
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex flex-col items-center justify-center px-4 py-12">
      <div className="mb-10">
        <Image src="/logo.png" alt="FasoData" width={180} height={56} className="h-12 w-auto" priority />
      </div>

      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-[#E04E2F]/8 text-[#E04E2F] text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Compte cree avec succes
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1A2C42] mb-2">
            Bienvenue{user?.full_name ? `, ${user.full_name.split(" ")[0]}` : ""} !
          </h1>
          <p className="text-gray-500 text-sm leading-relaxed max-w-md mx-auto">
            Selectionnez les thematiques qui vous interessent pour personnaliser votre experience FasoData.
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Choisissez au moins une thematique</p>
          {selected.size > 0 && (
            <span className="text-xs font-semibold text-[#E04E2F] bg-[#E04E2F]/8 px-2.5 py-1 rounded-full">
              {selected.size} selectionnee{selected.size > 1 ? "s" : ""}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 min-[430px]:grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
          {THEMES.map(({ id, icon: Icon, label, color, bg, border }) => {
            const active = selected.has(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggle(id)}
                aria-pressed={active}
                className={cn(
                  "flex min-h-16 items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-left transition-all duration-150",
                  active ? `${bg} ${border} shadow-sm` : "bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                )}
              >
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", active ? bg : "bg-gray-100")}>
                  <Icon className={cn("w-4 h-4", active ? color : "text-gray-400")} />
                </div>
                <span className={cn("text-sm font-medium leading-tight flex-1", active ? "text-gray-800" : "text-gray-600")}>
                  {label}
                </span>
                {active && <CheckCircle2 className={cn("w-4 h-4 shrink-0", color)} />}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={handleContinue}
            disabled={selected.size === 0 || saving}
            className={cn(
              "w-full sm:flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm transition-all",
              selected.size > 0 && !saving
                ? "bg-[#E04E2F] hover:bg-[#c73e22] text-white shadow-sm"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            )}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                Acceder a la plateforme
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleSkip}
            disabled={saving}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl text-sm font-medium text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-60 transition-colors"
          >
            Passer cette etape
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-6 text-center">
        Vous pourrez modifier vos preferences a tout moment depuis votre profil.
        <br />
        <Link href="/guide" className="font-semibold text-[#E04E2F] hover:underline">
          Consulter le guide d'utilisation
        </Link>
      </p>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <AuthGate allowedRoles={["admin", "institutional", "public"]}>
      <OnboardingContent />
    </AuthGate>
  );
}
