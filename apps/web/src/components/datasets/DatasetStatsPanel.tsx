"use client";

import { cn } from "@/lib/utils";

interface ColumnMeta {
  name: string;
  type?: string;
  unique_count?: number;
  null_count?: number;
  sample_values?: unknown[];
}

interface DatasetStatsPanelProps {
  columns: ColumnMeta[];
  rowCount?: number;
}

const TYPE_COLORS: Record<string, string> = {
  int64: "bg-blue-100 text-blue-700",
  float64: "bg-purple-100 text-purple-700",
  object: "bg-green-100 text-green-700",
  string: "bg-green-100 text-green-700",
  bool: "bg-yellow-100 text-yellow-700",
  datetime64: "bg-orange-100 text-orange-700",
  date: "bg-orange-100 text-orange-700",
};

function typeColor(type?: string) {
  if (!type) return "bg-gray-100 text-gray-500";
  for (const [key, cls] of Object.entries(TYPE_COLORS)) {
    if (type.toLowerCase().includes(key)) return cls;
  }
  return "bg-gray-100 text-gray-500";
}

function typeLabel(type?: string) {
  if (!type) return "—";
  if (type.includes("int")) return "Entier";
  if (type.includes("float")) return "Décimal";
  if (type.includes("datetime")) return "Horodatage";
  if (type.includes("date")) return "Date";
  if (type.includes("bool")) return "Booléen";
  if (type === "object" || type === "string") return "Texte";
  return type;
}

export function DatasetStatsPanel({ columns, rowCount }: DatasetStatsPanelProps) {
  if (!columns || columns.length === 0) {
    return (
      <div className="text-center py-6 text-gray-400 text-sm">
        Aucune statistique disponible.
      </div>
    );
  }

  const typeCounts = columns.reduce<Record<string, number>>((acc, col) => {
    const label = typeLabel(col.type);
    acc[label] = (acc[label] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Type distribution summary */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Types de colonnes
        </p>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(typeCounts).map(([label, count]) => (
            <span
              key={label}
              className={cn("px-2 py-0.5 rounded text-xs font-medium", typeColor(label))}
            >
              {label} × {count}
            </span>
          ))}
        </div>
      </div>

      {/* Per-column stats */}
      <div className="space-y-2">
        {columns.map((col) => {
          const nullPct =
            rowCount && col.null_count != null
              ? Math.round((col.null_count / rowCount) * 100)
              : null;

          return (
            <div key={col.name} className="rounded-lg border border-gray-100 p-3 bg-gray-50">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <span className="text-xs font-semibold text-gray-700 truncate" title={col.name}>
                  {col.name}
                </span>
                <span className={cn("text-xs px-1.5 py-0.5 rounded shrink-0", typeColor(col.type))}>
                  {typeLabel(col.type)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs text-gray-500 mb-2">
                {col.unique_count != null && (
                  <span>
                    <strong className="text-gray-700">{col.unique_count.toLocaleString("fr-FR")}</strong> valeurs uniques
                  </span>
                )}
                {col.null_count != null && (
                  <span>
                    <strong className="text-gray-700">{col.null_count.toLocaleString("fr-FR")}</strong> nulls
                  </span>
                )}
              </div>

              {nullPct !== null && (
                <div>
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                    <span>Complétude</span>
                    <span>{100 - nullPct}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        nullPct === 0 ? "bg-green-500" : nullPct < 10 ? "bg-yellow-400" : "bg-red-400"
                      )}
                      style={{ width: `${100 - nullPct}%` }}
                    />
                  </div>
                </div>
              )}

              {col.sample_values && col.sample_values.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {col.sample_values.slice(0, 3).map((v, i) => (
                    <span key={i} className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-xs text-gray-500 truncate max-w-[80px]" title={String(v)}>
                      {String(v)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
