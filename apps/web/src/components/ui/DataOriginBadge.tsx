import { Database, FlaskConical, Globe2, PenLine, RadioTower, UploadCloud } from "lucide-react";
import type { ElementType } from "react";
import { cn } from "@/lib/utils";

export type DataOrigin = "public" | "field" | "user_upload" | "manual" | "seed" | "simulation" | string | null | undefined;

const ORIGIN_CONFIG: Record<string, { label: string; className: string; icon: ElementType; title: string }> = {
  public: {
    label: "Source publique",
    className: "bg-emerald-50 text-emerald-700 border-emerald-100",
    icon: Globe2,
    title: "Donnee issue d'une source publique ou institutionnelle verifiee",
  },
  field: {
    label: "Terrain",
    className: "bg-blue-50 text-blue-700 border-blue-100",
    icon: RadioTower,
    title: "Donnee collectee sur le terrain via SMS, WhatsApp ou enquete",
  },
  user_upload: {
    label: "Upload ONG",
    className: "bg-indigo-50 text-indigo-700 border-indigo-100",
    icon: UploadCloud,
    title: "Dataset importe par une organisation utilisatrice",
  },
  manual: {
    label: "Saisie manuelle",
    className: "bg-slate-50 text-slate-700 border-slate-100",
    icon: PenLine,
    title: "Donnee ajoutee manuellement par un utilisateur autorise",
  },
  seed: {
    label: "Seed",
    className: "bg-amber-50 text-amber-700 border-amber-100",
    icon: Database,
    title: "Donnee de bootstrap ou de developpement, masquee en production publique",
  },
  simulation: {
    label: "Simulation",
    className: "bg-rose-50 text-rose-700 border-rose-100",
    icon: FlaskConical,
    title: "Donnee simulee, masquee en production publique",
  },
};

export function dataOriginLabel(origin: DataOrigin): string {
  const key = origin || "user_upload";
  return ORIGIN_CONFIG[key]?.label ?? String(key).replaceAll("_", " ");
}

export function DataOriginBadge({
  origin,
  compact = false,
  showSynthetic = false,
  className,
}: {
  origin: DataOrigin;
  compact?: boolean;
  showSynthetic?: boolean;
  className?: string;
}) {
  const key = origin || "user_upload";
  const isSynthetic = key === "seed" || key === "simulation";
  if (process.env.NODE_ENV === "production" && isSynthetic && !showSynthetic) {
    return null;
  }

  const config = ORIGIN_CONFIG[key] ?? {
    label: dataOriginLabel(key),
    className: "bg-gray-50 text-gray-600 border-gray-100",
    icon: Database,
    title: "Origine de donnee",
  };
  const Icon = config.icon;

  return (
    <span
      title={config.title}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-semibold whitespace-nowrap",
        compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-xs",
        config.className,
        className,
      )}
    >
      <Icon className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
      {config.label}
    </span>
  );
}
