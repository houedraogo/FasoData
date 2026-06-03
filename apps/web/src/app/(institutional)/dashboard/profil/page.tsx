"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  User, Building2, Mail, Lock, Eye, EyeOff,
  CheckCircle, Loader2, Shield, Calendar, Camera,
  MessageSquare, TrendingUp, BarChart3, AlertTriangle,
  Upload, X,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

// ── Schémas ────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  full_name:    z.string().min(2, "Minimum 2 caractères"),
  organization: z.string().optional(),
  bio:          z.string().max(300, "Maximum 300 caractères").optional(),
});

const passwordSchema = z
  .object({
    current_password: z.string().min(1, "Requis"),
    new_password:     z.string().min(8, "8 caractères minimum").regex(/[A-Z]/, "Une majuscule").regex(/[0-9]/, "Un chiffre"),
    confirm_password: z.string(),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirm_password"],
  });

type ProfileData  = z.infer<typeof profileSchema>;
type PasswordData = z.infer<typeof passwordSchema>;

// ── Composants UI ─────────────────────────────────────────────────────────

function SectionCard({ title, icon: Icon, children, action }: {
  title: string; icon: React.ElementType; children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#1A2C42]/10 rounded-lg flex items-center justify-center">
            <Icon className="w-4 h-4 text-[#1A2C42]" />
          </div>
          <h2 className="font-bold text-gray-900">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

const COMMODITY_LABELS: Record<string, string> = {
  sorghum: "Sorgho", rice_local: "Riz local", maize: "Maïs",
  millet: "Mil", cowpea: "Niébé", groundnut: "Arachide",
};

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  pending:    { label: "En attente",  color: "text-amber-600 bg-amber-50" },
  validated:  { label: "Validé",      color: "text-green-700 bg-green-50" },
  rejected:   { label: "Rejeté",      color: "text-red-600 bg-red-50" },
  aggregated: { label: "Agrégé",      color: "text-blue-700 bg-blue-50" },
  auto:       { label: "Auto",        color: "text-gray-600 bg-gray-50" },
};

// ── Page principale ────────────────────────────────────────────────────────

export default function ProfilPage() {
  const { user, fetchMe } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [meData, setMeData] = useState<{
    email: string; role: string; is_active: boolean;
    is_verified: boolean; created_at: string; bio?: string; avatar_url?: string;
  } | null>(null);

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showCurrent, setShowCurrent]   = useState(false);
  const [showNew, setShowNew]           = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [smsPage, setSmsPage]           = useState(1);

  useEffect(() => {
    api.get("/auth/me").then(({ data }) => setMeData(data));
  }, []);

  // ── Historique SMS ────────────────────────────────────────────────────────
  const { data: submissions, isLoading: smsLoading, refetch: refetchSms } = useQuery({
    queryKey: ["my-submissions", smsPage],
    queryFn: async () => {
      const { data } = await api.get(`/users/me/submissions?page=${smsPage}&page_size=10`);
      return data;
    },
    enabled: !!user,
  });

  // ── Upload avatar ─────────────────────────────────────────────────────────
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    // Upload
    setUploadingAvatar(true);
    try {
      const form = new FormData();
      form.append("file", file);
      await api.post("/users/me/avatar", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await fetchMe();
      await api.get("/auth/me").then(({ data }) => setMeData(data));
      toast.success("Photo de profil mise à jour ✅");
    } catch {
      toast.error("Erreur lors de l'upload");
      setAvatarPreview(null);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const removeAvatar = async () => {
    setAvatarPreview(null);
    try {
      await api.patch("/users/me", { avatar_url: null });
      await fetchMe();
      toast.success("Photo supprimée");
    } catch { /* ignore */ }
  };

  // ── Formulaire profil ─────────────────────────────────────────────────────
  const {
    register: regP, handleSubmit: handleProfile,
    formState: { errors: pErr, isSubmitting: pSubmit, isDirty: pDirty },
    reset: resetProfile,
  } = useForm<ProfileData>({ resolver: zodResolver(profileSchema), defaultValues: { full_name: "", organization: "", bio: "" } });

  useEffect(() => {
    if (user) resetProfile({ full_name: user.full_name ?? "", organization: user.organization ?? "" });
    if (meData?.bio !== undefined) resetProfile((prev) => ({ ...prev, bio: meData.bio ?? "" }));
  }, [user, meData, resetProfile]);

  const onProfile = async (data: ProfileData) => {
    try {
      await api.patch("/users/me", data);
      await fetchMe();
      toast.success("Profil mis à jour ✅");
    } catch { toast.error("Erreur lors de la mise à jour"); }
  };

  // ── Formulaire mot de passe ───────────────────────────────────────────────
  const {
    register: regW, handleSubmit: handlePassword,
    formState: { errors: wErr, isSubmitting: wSubmit },
    reset: resetPassword,
  } = useForm<PasswordData>({ resolver: zodResolver(passwordSchema) });

  const onPassword = async (data: PasswordData) => {
    try {
      await api.patch("/users/me", { password: data.new_password });
      toast.success("Mot de passe modifié ✅");
      resetPassword();
    } catch { toast.error("Impossible de modifier le mot de passe"); }
  };

  if (!user) return null;

  const initials   = (user.full_name || user.email).split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();
  const avatarSrc  = avatarPreview || meData?.avatar_url || null;
  const roleLabels: Record<string, string> = {
    admin: "Administrateur", institutional: "Contributeur", public: "Lecteur",
  };
  const stats = submissions?.stats ?? {};

  return (
    <div className="p-6 lg:p-8 max-w-3xl space-y-6">

      {/* ── En-tête — Avatar + identité ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start gap-5 flex-wrap">

          {/* Avatar cliquable */}
          <div className="relative shrink-0">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-24 h-24 rounded-2xl overflow-hidden cursor-pointer group relative
                         bg-[#1A2C42] flex items-center justify-center hover:opacity-90 transition-opacity"
            >
              {avatarSrc ? (
                <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-3xl font-bold">{initials}</span>
              )}
              {/* Overlay upload */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity
                              flex items-center justify-center rounded-2xl">
                {uploadingAvatar
                  ? <Loader2 className="w-6 h-6 text-white animate-spin" />
                  : <Camera className="w-6 h-6 text-white" />}
              </div>
            </div>

            {/* Supprimer photo */}
            {avatarSrc && !uploadingAvatar && (
              <button onClick={removeAvatar}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center
                           text-white hover:bg-red-600 transition-colors shadow-sm">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />

            <p className="text-[10px] text-gray-400 text-center mt-1.5">Cliquer pour changer</p>
          </div>

          {/* Infos */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-[#1A2C42] leading-tight">{user.full_name || "—"}</h1>
            <p className="text-gray-500 text-sm mt-0.5">{user.email}</p>
            {user.organization && (
              <p className="text-gray-400 text-xs mt-0.5 flex items-center gap-1">
                <Building2 className="w-3 h-3" /> {user.organization}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2.5 flex-wrap">
              <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium inline-flex items-center gap-1",
                user.role === "admin" ? "bg-red-100 text-red-700" :
                user.role === "institutional" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600")}>
                <Shield className="w-3 h-3" />
                {roleLabels[user.role] ?? user.role}
              </span>
              {meData?.created_at && (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Membre depuis {formatDate(meData.created_at)}
                </span>
              )}
              {meData?.is_verified && (
                <span className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Vérifié
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Bouton upload alternatif */}
        <button onClick={() => fileInputRef.current?.click()}
          className="mt-4 flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-[#E04E2F] transition-colors">
          <Upload className="w-3.5 h-3.5" />
          {avatarSrc ? "Changer la photo" : "Ajouter une photo de profil"}
          <span className="text-gray-300">· JPG, PNG, WebP · max 5 Mo</span>
        </button>
      </div>

      {/* ── Stats rapides ── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: MessageSquare, label: "Relevés SMS soumis", value: stats.total_submissions ?? 0, color: "bg-blue-50 text-blue-600" },
          { icon: BarChart3,    label: "Prix moyen",           value: stats.avg_price ? `${stats.avg_price} CFA/kg` : "—", color: "bg-purple-50 text-purple-600" },
          { icon: TrendingUp,  label: "Produits couverts",    value: stats.commodities_count ?? 0, color: "bg-green-50 text-green-600" },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center mb-2", color)}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="text-xl font-bold text-gray-900">{value}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* ── Historique des relevés SMS ── */}
      <SectionCard title="Mes relevés de prix" icon={MessageSquare}>
        {smsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : !submissions?.items?.length ? (
          <div className="text-center py-10 text-gray-300">
            <MessageSquare className="w-10 h-10 mx-auto mb-3" />
            <p className="text-sm text-gray-400 font-medium">Aucun relevé soumis</p>
            <p className="text-xs text-gray-300 mt-1">
              Utilisez la{" "}
              <a href="/terrain" className="text-[#E04E2F] hover:underline">page terrain</a>
              {" "}pour soumettre des prix.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                    <th className="text-left px-4 py-2.5">Produit</th>
                    <th className="text-left px-4 py-2.5">Région</th>
                    <th className="text-right px-4 py-2.5">Prix</th>
                    <th className="text-left px-4 py-2.5">Statut</th>
                    <th className="text-left px-4 py-2.5">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {submissions.items.map((r: {
                    id: string; commodity: string; region: string; price: number;
                    validation_status: string; price_date: string; anomaly_score?: number;
                  }) => {
                    const sc = STATUS_CFG[r.validation_status ?? "auto"] ?? STATUS_CFG.auto;
                    return (
                      <tr key={r.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-800">
                          {COMMODITY_LABELS[r.commodity] ?? r.commodity}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{r.region}</td>
                        <td className="px-4 py-3 text-right font-bold text-[#E04E2F]">
                          {r.price} <span className="text-xs font-normal text-gray-400">CFA/kg</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", sc.color)}>
                              {sc.label}
                            </span>
                            {r.anomaly_score && r.anomaly_score > 30 && (
                              <span title={`Écart ${r.anomaly_score}%`}>
                                <AlertTriangle className="w-3 h-3 text-amber-500" />
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400">{formatDate(r.price_date)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {submissions.total > 10 && (
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                <span className="text-xs text-gray-500">{submissions.total} relevé(s) total</span>
                <div className="flex gap-2">
                  <button onClick={() => setSmsPage(Math.max(1, smsPage - 1))} disabled={smsPage === 1}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs disabled:opacity-40 hover:bg-gray-50">
                    Précédent
                  </button>
                  <button onClick={() => setSmsPage(smsPage + 1)} disabled={smsPage * 10 >= submissions.total}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs disabled:opacity-40 hover:bg-gray-50">
                    Suivant
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </SectionCard>

      {/* ── Informations du compte ── */}
      <SectionCard title="Informations du compte" icon={Mail}>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          {[
            { label: "Adresse email",   value: user.email },
            { label: "Rôle",            value: roleLabels[user.role] ?? user.role },
            { label: "Organisation",    value: user.organization || "—" },
            { label: "Statut",          value: meData?.is_active ? "✅ Actif" : "❌ Inactif" },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-50 rounded-xl p-3">
              <dt className="text-xs text-gray-400 mb-1">{label}</dt>
              <dd className="font-medium text-gray-800 text-sm">{value}</dd>
            </div>
          ))}
        </dl>
      </SectionCard>

      {/* ── Modifier le profil ── */}
      <SectionCard title="Modifier le profil" icon={User}>
        <form onSubmit={handleProfile(onProfile)} className="space-y-4">
          <Field label="Nom complet" error={pErr.full_name?.message}>
            <input {...regP("full_name")} className="input-field" placeholder="Prénom Nom" />
          </Field>
          <Field label="Organisation" error={pErr.organization?.message}>
            <div className="relative">
              <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input {...regP("organization")} className="input-field pl-10" placeholder="Ministère / ONG / Entreprise" />
            </div>
          </Field>
          <Field label="Biographie (max 300 car.)" error={pErr.bio?.message}>
            <textarea {...regP("bio")} rows={3} className="input-field resize-none"
              placeholder="Quelques mots sur vous ou votre organisation…" />
          </Field>
          <div className="flex justify-end">
            <button type="submit" disabled={pSubmit || !pDirty} className="btn-primary disabled:opacity-50">
              {pSubmit ? <><Loader2 className="w-4 h-4 animate-spin" />Sauvegarde…</> : "Enregistrer"}
            </button>
          </div>
        </form>
      </SectionCard>

      {/* ── Changer le mot de passe ── */}
      <SectionCard title="Sécurité" icon={Lock}>
        <form onSubmit={handlePassword(onPassword)} className="space-y-4">
          <Field label="Mot de passe actuel" error={wErr.current_password?.message}>
            <div className="relative">
              <input type={showCurrent ? "text" : "password"} {...regW("current_password")}
                className="input-field pr-11" placeholder="••••••••" />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nouveau mot de passe" error={wErr.new_password?.message}>
              <div className="relative">
                <input type={showNew ? "text" : "password"} {...regW("new_password")}
                  className="input-field pr-11" placeholder="••••••••" />
                <button type="button" onClick={() => setShowNew(!showNew)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </Field>
            <Field label="Confirmer" error={wErr.confirm_password?.message}>
              <div className="relative">
                <input type={showConfirm ? "text" : "password"} {...regW("confirm_password")}
                  className="input-field pr-11" placeholder="••••••••" />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </Field>
          </div>
          <p className="text-xs text-gray-400">8 caractères minimum, au moins une majuscule et un chiffre.</p>
          <div className="flex justify-end">
            <button type="submit" disabled={wSubmit} className="btn-primary disabled:opacity-50">
              {wSubmit ? <><Loader2 className="w-4 h-4 animate-spin" />Modification…</> : "Changer le mot de passe"}
            </button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}
