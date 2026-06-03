"use client";

import { useMemo, useState } from "react";
import {
  Bell,
  ChevronDown,
  Download,
  Layers,
  Map,
  MoreHorizontal,
  RotateCcw,
  SlidersHorizontal,
  ZoomIn,
} from "lucide-react";
import { cn } from "@/lib/utils";

type IndicatorKey = "prix_mais" | "ipc" | "vaccination" | "scolarisation" | "pluie";

type Region = {
  id: string;
  name: string;
  chef: string;
  provinces: number;
  path: string;
  labelX: number;
  labelY: number;
  prix_mais: number;
  ipc: string;
  vaccination: number;
  scolarisation: number;
  pluie: number;
  markets: number;
  healthCenters: number;
  population: string;
  alert?: string;
};

const INDICATORS: Array<{ key: IndicatorKey; label: string; unit: string; range: string[] }> = [
  { key: "prix_mais", label: "Prix du mais (CFA/kg)", unit: "CFA/kg", range: ["220", "270", "320", "360+"] },
  { key: "ipc", label: "Insecurite alimentaire (IPC)", unit: "phase", range: ["1", "2", "3", "4"] },
  { key: "vaccination", label: "Couverture vaccinale", unit: "%", range: ["55", "70", "85", "95"] },
  { key: "scolarisation", label: "Taux scolarisation", unit: "%", range: ["45", "60", "75", "90"] },
  { key: "pluie", label: "Precipitations", unit: "mm", range: ["120", "240", "360", "480+"] },
];

const REGIONS: Region[] = [
  { id: "sahel", name: "Sahel", chef: "Dori", provinces: 4, path: "M492 144 L747 158 L760 260 L592 282 L488 238 Z", labelX: 596, labelY: 190, prix_mais: 342, ipc: "Phase 3", vaccination: 66, scolarisation: 54, pluie: 220, markets: 6, healthCenters: 142, population: "1.21 M", alert: "Prix du mais depassant le seuil de 320 CFA/kg depuis 3 semaines consecutives." },
  { id: "nord", name: "Nord", chef: "Ouahigouya", provinces: 4, path: "M298 176 L488 238 L392 326 L250 300 Z", labelX: 370, labelY: 236, prix_mais: 318, ipc: "Phase 2", vaccination: 74, scolarisation: 61, pluie: 280, markets: 8, healthCenters: 128, population: "1.72 M" },
  { id: "centre-nord", name: "Centre-Nord", chef: "Kaya", provinces: 3, path: "M392 326 L488 238 L592 282 L586 384 L452 406 Z", labelX: 500, labelY: 326, prix_mais: 305, ipc: "Phase 2", vaccination: 78, scolarisation: 64, pluie: 300, markets: 7, healthCenters: 118, population: "1.58 M" },
  { id: "est", name: "Est", chef: "Fada N'Gourma", provinces: 5, path: "M592 282 L760 260 L848 438 L706 542 L586 452 L586 384 Z", labelX: 690, labelY: 388, prix_mais: 328, ipc: "Phase 3", vaccination: 69, scolarisation: 58, pluie: 340, markets: 9, healthCenters: 154, population: "1.94 M", alert: "Hausse rapide des prix sur les marches suivis de Fada et Pama." },
  { id: "centre", name: "Centre", chef: "Ouagadougou", provinces: 1, path: "M392 326 L452 406 L430 476 L332 462 L310 376 Z", labelX: 390, labelY: 392, prix_mais: 320, ipc: "Phase 2", vaccination: 86, scolarisation: 78, pluie: 305, markets: 18, healthCenters: 214, population: "3.04 M" },
  { id: "centre-ouest", name: "Centre-Ouest", chef: "Koudougou", provinces: 4, path: "M250 300 L392 326 L310 376 L318 470 L214 454 L180 404 Z", labelX: 285, labelY: 348, prix_mais: 288, ipc: "Phase 2", vaccination: 81, scolarisation: 72, pluie: 360, markets: 11, healthCenters: 131, population: "1.16 M" },
  { id: "hauts-bassins", name: "Hauts-Bassins", chef: "Bobo-Dioulasso", provinces: 3, path: "M214 454 L318 470 L362 542 L270 640 L148 598 L126 510 Z", labelX: 244, labelY: 530, prix_mais: 295, ipc: "Phase 1", vaccination: 88, scolarisation: 80, pluie: 430, markets: 14, healthCenters: 176, population: "2.03 M" },
  { id: "boucle", name: "Boucle du Mouhoun", chef: "Dedougou", provinces: 6, path: "M150 248 L298 176 L250 300 L180 404 L214 454 L126 510 L104 382 Z", labelX: 198, labelY: 334, prix_mais: 298, ipc: "Phase 2", vaccination: 73, scolarisation: 67, pluie: 385, markets: 12, healthCenters: 122, population: "1.98 M" },
  { id: "centre-est", name: "Centre-Est", chef: "Tenkodogo", provinces: 3, path: "M452 406 L586 384 L586 452 L706 542 L662 654 L520 628 L430 476 Z", labelX: 552, labelY: 520, prix_mais: 285, ipc: "Phase 2", vaccination: 80, scolarisation: 69, pluie: 390, markets: 8, healthCenters: 119, population: "1.15 M" },
  { id: "centre-sud", name: "Centre-Sud", chef: "Manga", provinces: 3, path: "M430 476 L520 628 L408 668 L322 620 L362 542 Z", labelX: 416, labelY: 560, prix_mais: 280, ipc: "Phase 1", vaccination: 84, scolarisation: 70, pluie: 410, markets: 5, healthCenters: 84, population: "812 k" },
  { id: "plateau", name: "Plateau Central", chef: "Ziniare", provinces: 3, path: "M430 476 L452 406 L586 384 L586 452 Z", labelX: 500, labelY: 438, prix_mais: 294, ipc: "Phase 2", vaccination: 82, scolarisation: 68, pluie: 330, markets: 6, healthCenters: 92, population: "741 k" },
  { id: "sud-ouest", name: "Sud-Ouest", chef: "Diebougou", provinces: 4, path: "M270 640 L362 542 L322 620 L408 668 L300 786 L190 736 Z", labelX: 300, labelY: 690, prix_mais: 278, ipc: "Phase 1", vaccination: 77, scolarisation: 63, pluie: 455, markets: 4, healthCenters: 73, population: "929 k" },
  { id: "cascades", name: "Cascades", chef: "Banfora", provinces: 2, path: "M126 510 L270 640 L190 736 L92 704 L64 560 Z", labelX: 142, labelY: 612, prix_mais: 270, ipc: "Phase 1", vaccination: 83, scolarisation: 76, pluie: 480, markets: 6, healthCenters: 62, population: "812 k" },
];

const BASE_LAYERS = [
  { label: "Marches alimentaires", count: "4 821", enabled: true },
  { label: "Centres de sante", count: "2 134", enabled: true },
  { label: "Ecoles primaires", count: "14 280", enabled: false },
  { label: "Points d'eau", count: "8 712", enabled: false },
  { label: "Limites administratives", count: "13", enabled: true },
];

const PERIODS = ["7j", "30j", "3m", "12m", "3a"];

function getRegionValue(region: Region, indicator: IndicatorKey) {
  return region[indicator];
}

function getFill(region: Region, indicator: IndicatorKey) {
  const value = getRegionValue(region, indicator);

  if (indicator === "ipc") {
    return region.ipc === "Phase 3" ? "#E04E2F" : region.ipc === "Phase 2" ? "#F5A623" : "#E7F4EC";
  }

  const numeric = Number(value);
  if (indicator === "prix_mais") {
    if (numeric >= 325) return "#A62A1C";
    if (numeric >= 310) return "#E04E2F";
    if (numeric >= 285) return "#F5A623";
    return "#E7F4EC";
  }
  if (indicator === "pluie") {
    if (numeric >= 430) return "#1D4ED8";
    if (numeric >= 360) return "#2E7D52";
    if (numeric >= 280) return "#F5A623";
    return "#FDE68A";
  }
  if (numeric >= 84) return "#2E7D52";
  if (numeric >= 75) return "#F5A623";
  if (numeric >= 65) return "#E04E2F";
  return "#A62A1C";
}

function formatValue(region: Region, indicator: IndicatorKey) {
  const selected = INDICATORS.find((item) => item.key === indicator) ?? INDICATORS[0];
  return `${getRegionValue(region, indicator)} ${selected.unit}`;
}

export default function BurkinaMap() {
  const [indicator, setIndicator] = useState<IndicatorKey>("prix_mais");
  const [selectedRegionId, setSelectedRegionId] = useState("sahel");
  const [period, setPeriod] = useState("12m");
  const [layers, setLayers] = useState(BASE_LAYERS);

  const selectedIndicator = INDICATORS.find((item) => item.key === indicator) ?? INDICATORS[0];
  const selectedRegion = REGIONS.find((region) => region.id === selectedRegionId) ?? REGIONS[0];
  const callouts = useMemo(() => ["sahel", "centre", "centre-ouest", "hauts-bassins"].map((id) => REGIONS.find((region) => region.id === id)).filter(Boolean) as Region[], []);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#F4F6FA]">
      <div className="border-b border-gray-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>Tableaux de bord</span>
              <span>/</span>
              <span className="font-semibold text-gray-900">Carte interactive</span>
            </div>
            <h1 className="mt-1 text-xl font-bold text-gray-900">Carte interactive du Burkina Faso</h1>
          </div>
          <div className="hidden items-center gap-3 md:flex">
            <span className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#E04E2F]">FR / EN</span>
            <button className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-500">
              <Bell className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1600px] grid-cols-1 bg-white lg:grid-cols-[320px_minmax(520px,1fr)_320px]">
        <aside className="border-b border-gray-200 bg-white p-5 lg:border-b-0 lg:border-r">
          <h2 className="text-2xl font-semibold text-gray-900">Couches & filtres</h2>

          <section className="mt-7">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500">Indicateur affiche</h3>
            <div className="space-y-2">
              {INDICATORS.map((item) => (
                <button
                  key={item.key}
                  onClick={() => setIndicator(item.key)}
                  className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition", indicator === item.key ? "bg-red-50 text-gray-900" : "text-gray-600 hover:bg-gray-50")}
                >
                  <span className={cn("flex h-5 w-5 items-center justify-center rounded-full border-4", indicator === item.key ? "border-[#E04E2F]" : "border-gray-200")} />
                  {item.label}
                </button>
              ))}
            </div>
          </section>

          <section className="mt-7">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500">Calques superposes</h3>
            <div className="space-y-3">
              {layers.map((layer) => (
                <button
                  key={layer.label}
                  onClick={() => setLayers((current) => current.map((item) => item.label === layer.label ? { ...item, enabled: !item.enabled } : item))}
                  className="flex w-full items-center justify-between gap-3 text-left"
                >
                  <span className="flex items-center gap-3 text-sm font-medium text-gray-700">
                    <span className={cn("flex h-6 w-10 rounded-full p-0.5 transition", layer.enabled ? "bg-[#E04E2F]" : "bg-gray-200")}>
                      <span className={cn("h-5 w-5 rounded-full bg-white shadow transition", layer.enabled ? "translate-x-4" : "translate-x-0")} />
                    </span>
                    {layer.label}
                  </span>
                  <span className="text-xs text-gray-500">{layer.count}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="mt-7">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500">Periode</h3>
            <div className="grid grid-cols-5 gap-2">
              {PERIODS.map((item) => (
                <button
                  key={item}
                  onClick={() => setPeriod(item)}
                  className={cn("rounded-lg border px-2 py-2 text-xs font-bold", period === item ? "border-[#1A2C42] bg-[#1A2C42] text-white" : "border-gray-200 bg-white text-gray-600")}
                >
                  {item}
                </button>
              ))}
            </div>
            <p className="mt-3 text-center text-xs text-gray-500">Du 22 oct. 2024 au 22 oct. 2025</p>
          </section>

          <section className="mt-8 rounded-2xl bg-gray-50 p-4">
            <h3 className="mb-3 text-sm font-bold text-gray-900">{selectedIndicator.label}</h3>
            <div className="h-4 rounded-full bg-gradient-to-r from-[#E7F4EC] via-[#FACC15] via-[#F5A623] to-[#A62A1C]" />
            <div className="mt-2 flex justify-between text-xs text-gray-500">
              {selectedIndicator.range.map((item) => <span key={item}>{item}</span>)}
            </div>
          </section>
        </aside>

        <main className="relative min-h-[720px] overflow-hidden bg-[#F8FAFC]">
          <div className="absolute inset-0 opacity-70 [background-image:linear-gradient(#DDE5EE_1px,transparent_1px),linear-gradient(90deg,#DDE5EE_1px,transparent_1px)] [background-size:12px_12px]" />

          <div className="absolute left-5 right-5 top-5 z-10 flex flex-wrap items-center gap-3">
            <button className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-gray-800 shadow-sm ring-1 ring-gray-200">
              <Map className="h-4 w-4" /> Vue : Choroplethe <ChevronDown className="h-4 w-4 text-gray-400" />
            </button>
            <button className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-gray-800 shadow-sm ring-1 ring-gray-200">
              <SlidersHorizontal className="h-4 w-4" /> 13 regions affichees
            </button>
            <span className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-gray-800 shadow-sm ring-1 ring-gray-200">
              <span className="h-2.5 w-2.5 rounded-full bg-green-600" /> Mis a jour il y a 2 h
            </span>
            <button className="ml-auto flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
              <Download className="h-4 w-4" />
            </button>
            <button className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>

          <div className="absolute inset-0 flex items-center justify-center p-8 pt-24">
            <svg viewBox="0 0 920 820" className="h-full max-h-[680px] w-full max-w-[900px] drop-shadow-sm" role="img" aria-label="Carte choroplethe du Burkina Faso">
              {REGIONS.map((region) => (
                <path
                  key={region.id}
                  data-region-id={region.id}
                  aria-label={`Selectionner ${region.name}`}
                  d={region.path}
                  fill={getFill(region, indicator)}
                  stroke={selectedRegion.id === region.id ? "#1A2C42" : "#24364A"}
                  strokeWidth={selectedRegion.id === region.id ? 3 : 1.6}
                  opacity={selectedRegion.id === region.id ? 1 : 0.93}
                  className="cursor-pointer transition hover:opacity-100"
                  onClick={() => setSelectedRegionId(region.id)}
                />
              ))}

              {layers.find((layer) => layer.label === "Marches alimentaires")?.enabled &&
                REGIONS.slice(0, 10).map((region) => (
                  <circle key={`market-${region.id}`} cx={region.labelX} cy={region.labelY} r="5" fill="#E04E2F" stroke="white" strokeWidth="2" />
                ))}

              {callouts.map((region) => (
                <g key={`callout-${region.id}`} className="cursor-pointer" onClick={() => setSelectedRegionId(region.id)}>
                  <rect x={region.labelX - 84} y={region.labelY - 34} width="168" height="34" rx="16" fill="white" stroke={region.alert ? "#E04E2F" : "#1A2C42"} strokeWidth="2" />
                  <path d={`M${region.labelX - 8} ${region.labelY} L${region.labelX} ${region.labelY + 16} L${region.labelX + 8} ${region.labelY} Z`} fill={region.alert ? "#E04E2F" : "#1A2C42"} />
                  <circle cx={region.labelX - 58} cy={region.labelY - 17} r="5" fill={region.alert ? "#E04E2F" : "#1A2C42"} />
                  <text x={region.labelX - 44} y={region.labelY - 12} fill="#1F2937" fontSize="14" fontWeight="700">
                    {region.chef.length > 12 ? `${region.chef.slice(0, 10)}.` : region.chef} - {formatValue(region, indicator)}
                  </text>
                </g>
              ))}
            </svg>
          </div>

          <div className="absolute bottom-5 left-5 rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-gray-200">
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span className="h-1.5 w-20 rounded-full bg-[#1A2C42]" />
              100 km
            </div>
          </div>

          <div className="absolute bottom-5 right-5 flex flex-col gap-2">
            <button className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-gray-200"><ZoomIn className="h-4 w-4" /></button>
            <button className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-gray-200"><MoreHorizontal className="h-4 w-4" /></button>
            <button className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-gray-200"><RotateCcw className="h-4 w-4" /></button>
          </div>
        </main>

        <aside className="border-t border-gray-200 bg-white p-5 lg:border-l lg:border-t-0">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Region selectionnee</p>
          <h2 className="mt-3 text-3xl font-semibold text-gray-900">{selectedRegion.name}</h2>
          <p className="mt-2 text-sm text-gray-500">
            {selectedRegion.provinces} provinces - {selectedRegion.chef} (chef-lieu)
          </p>

          {selectedRegion.alert && (
            <div className="mt-6 rounded-2xl border border-[#E04E2F] bg-red-50 p-4">
              <p className="text-sm font-bold uppercase text-[#E04E2F]">Alerte critique</p>
              <p className="mt-2 text-sm leading-6 text-gray-800">{selectedRegion.alert}</p>
            </div>
          )}

          <div className="mt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Valeur affichee</p>
              <span className="text-xs font-bold text-[#E04E2F]">+24%</span>
            </div>
            <p className="mt-3 text-4xl font-bold text-gray-900">
              {getRegionValue(selectedRegion, indicator)} <span className="text-base font-medium text-gray-500">{selectedIndicator.unit}</span>
            </p>
            <svg viewBox="0 0 280 90" className="mt-5 h-24 w-full">
              <path d="M0 70 C40 66 48 55 82 52 C128 48 136 36 176 32 C218 27 224 20 280 16 L280 90 L0 90 Z" fill="#FDE8E2" />
              <path d="M0 70 C40 66 48 55 82 52 C128 48 136 36 176 32 C218 27 224 20 280 16" fill="none" stroke="#E04E2F" strokeWidth="3" />
            </svg>
          </div>

          <div className="mt-6 border-t border-gray-100 pt-5">
            <div className="mb-3 flex items-center gap-2">
              <Layers className="h-4 w-4 text-[#E04E2F]" />
              <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500">Autres indicateurs</h3>
            </div>
            {[
              ["Insecurite alim. (IPC)", selectedRegion.ipc, "text-amber-600"],
              ["Marches suivis", selectedRegion.markets, "text-gray-900"],
              ["Centres de sante", selectedRegion.healthCenters, "text-green-700"],
              ["Precipitations", `${selectedRegion.pluie} mm`, "text-blue-600"],
              ["Pop. estimee", selectedRegion.population, "text-gray-900"],
            ].map(([label, value, color]) => (
              <div key={label} className="flex items-center justify-between border-b border-gray-100 py-2 text-sm">
                <span className="max-w-[140px] text-gray-600">{label}</span>
                <span className={cn("font-bold", color as string)}>{value}</span>
              </div>
            ))}
          </div>

          <button className="mt-6 w-full rounded-xl bg-[#E04E2F] px-4 py-3 text-sm font-bold text-white">
            Tableau de bord regional
          </button>
          <button className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-700">
            <Download className="h-4 w-4" /> Exporter ces donnees
          </button>
        </aside>
      </div>
    </div>
  );
}
