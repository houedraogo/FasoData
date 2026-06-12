"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bell,
  ChevronDown,
  Download,
  Layers,
  Map as MapIcon,
  MapPin,
  MoreHorizontal,
  RefreshCw,
  RotateCcw,
  SlidersHorizontal,
  ZoomIn,
} from "lucide-react";
import type { Map as LeafletMap } from "leaflet";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type IndicatorKey = "prix_mais" | "ipc" | "datasets" | "marches";
type PeriodKey = "30j" | "3m" | "12m" | "3a";

interface GeoFeature {
  type: "Feature";
  properties: { name: string; capital?: string; code?: string };
  geometry: unknown;
}

interface GeoJson {
  type: "FeatureCollection";
  features: GeoFeature[];
}

interface PriceRow {
  id?: string;
  commodity: string;
  region: string;
  market?: string | null;
  price: number;
  price_date?: string;
}

interface DatasetItem {
  id: string;
  name: string;
  is_geo: boolean;
  category?: string | null;
  row_count?: number | null;
}

interface AlertFeed {
  items: Array<{ id: string; title: string; location: string; value: string; severity: "critical" | "warning" | "info" }>;
}

interface RegionMetric {
  name: string;
  capital: string;
  price: number | null;
  priceDate: string | null;
  markets: number;
  datasets: number;
  ipcPhase: number;
  alert: AlertFeed["items"][number] | null;
}

const COMMODITIES = [
  { key: "maize", label: "Mais", threshold: 300 },
  { key: "millet", label: "Mil", threshold: 350 },
  { key: "sorghum", label: "Sorgho", threshold: 320 },
  { key: "rice_imported", label: "Riz importé", threshold: 500 },
  { key: "cowpea", label: "Niebe", threshold: 650 },
];

const INDICATORS: Array<{ key: IndicatorKey; label: string; unit: string; range: string[] }> = [
  { key: "prix_mais", label: "Prix alimentaire", unit: "CFA/kg", range: ["< 70%", "85%", "105%", "> 115%"] },
  { key: "ipc", label: "Alerte alimentaire", unit: "phase", range: ["1", "2", "3", "4"] },
  { key: "datasets", label: "Couverture datasets", unit: "datasets", range: ["0", "1", "3", "5+"] },
  { key: "marches", label: "Marches suivis", unit: "marches", range: ["0", "2", "5", "8+"] },
];

const PERIODS: Array<{ key: PeriodKey; label: string; months: number }> = [
  { key: "30j", label: "30j", months: 1 },
  { key: "3m", label: "3m", months: 3 },
  { key: "12m", label: "12m", months: 12 },
  { key: "3a", label: "3a", months: 36 },
];

const INITIAL_LAYERS = [
  { key: "markets", label: "Marches alimentaires", enabled: true },
  { key: "alerts", label: "Alertes actives", enabled: true },
  { key: "datasets", label: "Datasets geographiques", enabled: true },
  { key: "labels", label: "Noms des regions", enabled: true },
];

const REGION_NAMES = [
  "Sahel", "Est", "Nord", "Centre-Nord", "Boucle du Mouhoun", "Centre", "Plateau Central",
  "Centre-Est", "Centre-Ouest", "Centre-Sud", "Hauts-Bassins", "Cascades", "Sud-Ouest",
];

function destroyLeafletContainer(el: HTMLElement | null) {
  if (!el) return;
  delete (el as any)._leaflet_id;
  delete (el as any)._leaflet;
  el.innerHTML = "";
}

function periodStart(period: PeriodKey) {
  const selected = PERIODS.find((item) => item.key === period) ?? PERIODS[2];
  const date = new Date();
  date.setMonth(date.getMonth() - selected.months);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function metricValue(region: RegionMetric, indicator: IndicatorKey) {
  if (indicator === "prix_mais") return region.price ?? 0;
  if (indicator === "ipc") return region.ipcPhase;
  if (indicator === "datasets") return region.datasets;
  return region.markets;
}

function fillColor(region: RegionMetric, indicator: IndicatorKey, threshold: number) {
  const value = metricValue(region, indicator);
  if (!value) return "#E5E7EB";

  if (indicator === "prix_mais") {
    const ratio = value / threshold;
    if (ratio < 0.7) return "#166534";
    if (ratio < 0.85) return "#16A34A";
    if (ratio < 1.05) return "#FDE68A";
    if (ratio < 1.15) return "#F97316";
    return "#DC2626";
  }
  if (indicator === "ipc") {
    if (value >= 4) return "#DC2626";
    if (value >= 3) return "#F97316";
    if (value >= 2) return "#FDE68A";
    return "#DCFCE7";
  }
  if (indicator === "datasets") {
    if (value >= 5) return "#1D4ED8";
    if (value >= 3) return "#2563EB";
    if (value >= 1) return "#93C5FD";
    return "#E5E7EB";
  }
  if (value >= 8) return "#1A2C42";
  if (value >= 5) return "#2E7D52";
  if (value >= 2) return "#F5A623";
  return "#E5E7EB";
}

function formatMetric(region: RegionMetric, indicator: IndicatorKey, unit: string) {
  const value = metricValue(region, indicator);
  if (!value) return "Pas de donnees";
  if (indicator === "ipc") return `Phase ${value}`;
  return `${Math.round(value)} ${unit}`;
}

function csvExport(rows: RegionMetric[], indicator: IndicatorKey) {
  const headers = ["region", "chef_lieu", "prix", "date_prix", "marches", "datasets", "phase_ipc", "alerte"];
  const body = rows.map((row) => [
    row.name,
    row.capital,
    row.price ?? "",
    row.priceDate ?? "",
    row.markets,
    row.datasets,
    row.ipcPhase,
    row.alert?.title ?? "",
  ]);
  const csv = [headers, ...body].map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `carte-burkina-${indicator}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function BurkinaMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<LeafletMap | null>(null);
  const [indicator, setIndicator] = useState<IndicatorKey>("prix_mais");
  const [commodity, setCommodity] = useState("maize");
  const [period, setPeriod] = useState<PeriodKey>("12m");
  const [selectedRegionName, setSelectedRegionName] = useState("Sahel");
  const [layers, setLayers] = useState(INITIAL_LAYERS);

  const activeCommodity = COMMODITIES.find((item) => item.key === commodity) ?? COMMODITIES[0];
  const activeIndicator = INDICATORS.find((item) => item.key === indicator) ?? INDICATORS[0];
  const start = periodStart(period);

  const { data: geojson } = useQuery<GeoJson>({
    queryKey: ["burkina-geojson"],
    queryFn: async () => {
      const response = await fetch("/geojson/burkina-regions.geojson");
      if (!response.ok) throw new Error("GeoJSON introuvable");
      return response.json();
    },
  });

  const { data: latestPrices = [], isFetching: pricesFetching, refetch } = useQuery<PriceRow[]>({
    queryKey: ["map-prices", commodity, period],
    queryFn: async () => {
      const results = await Promise.allSettled(
        REGION_NAMES.map((region) =>
          fetch(`/api/prices/latest?region=${encodeURIComponent(region)}`)
            .then((response) => response.ok ? response.json() : [])
            .then((data: PriceRow[]) => {
              const match = data.find((row) => row.commodity === commodity);
              return match ? { ...match, region } : null;
            })
        )
      );
      return results
        .map((result) => result.status === "fulfilled" ? result.value : null)
        .filter(Boolean) as PriceRow[];
    },
    staleTime: 5 * 60_000,
  });

  const { data: datasets } = useQuery<{ items: DatasetItem[]; total: number }>({
    queryKey: ["map-datasets"],
    queryFn: async () => {
      const { data } = await api.get("/datasets?page_size=100&status=published");
      return data;
    },
    staleTime: 10 * 60_000,
  });

  const { data: alerts } = useQuery<AlertFeed>({
    queryKey: ["map-alerts"],
    queryFn: async () => {
      const { data } = await api.get("/dashboard/alerts");
      return data;
    },
    staleTime: 60_000,
  });

  const metrics = useMemo<RegionMetric[]>(() => {
    const pricesByRegion = new globalThis.Map(latestPrices.map((row) => [row.region, row]));
    const geoDatasets = (datasets?.items ?? []).filter((item) => item.is_geo);
    const alertItems = alerts?.items ?? [];
    const features = geojson?.features ?? REGION_NAMES.map((name) => ({ properties: { name, capital: "" } } as GeoFeature));

    return features.map((feature) => {
      const name = feature.properties.name;
      const price = pricesByRegion.get(name);
      const marketCount = latestPrices.filter((row) => row.region === name).length;
      const datasetCount = geoDatasets.filter((dataset) => {
        const haystack = `${dataset.name} ${dataset.category ?? ""}`.toLowerCase();
        return haystack.includes(name.toLowerCase()) || haystack.includes("burkina");
      }).length;
      const alert = alertItems.find((item) => item.location?.toLowerCase().includes(name.toLowerCase())) ?? null;
      const phase = alert?.severity === "critical" ? 3 : alert?.severity === "warning" ? 2 : price && price.price > activeCommodity.threshold ? 2 : 1;

      return {
        name,
        capital: feature.properties.capital ?? "",
        price: price?.price ?? null,
        priceDate: price?.price_date ?? null,
        markets: marketCount,
        datasets: datasetCount,
        ipcPhase: phase,
        alert,
      };
    });
  }, [activeCommodity.threshold, alerts?.items, datasets?.items, geojson?.features, latestPrices]);

  const selectedRegion = metrics.find((region) => region.name === selectedRegionName) ?? metrics[0];
  const layerState = Object.fromEntries(layers.map((layer) => [layer.key, layer.enabled]));
  const visibleRegions = metrics.filter((region) => metricValue(region, indicator) > 0).length;

  useEffect(() => {
    if (!geojson || !mapRef.current) return;
    let cancelled = false;

    const init = async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapRef.current) return;

      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
      destroyLeafletContainer(mapRef.current);

      const map = L.map(mapRef.current, {
        center: [12.4, -1.5],
        zoom: 6,
        minZoom: 5,
        maxZoom: 9,
        scrollWheelZoom: true,
        attributionControl: false,
      });

      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
      }).addTo(map);

      const metricByName = new globalThis.Map(metrics.map((region) => [region.name, region]));
      const geoLayer = L.geoJSON(geojson as any, {
        style: (feature: any) => {
          const region = metricByName.get(feature?.properties?.name ?? "");
          return {
            fillColor: region ? fillColor(region, indicator, activeCommodity.threshold) : "#E5E7EB",
            fillOpacity: region ? 0.82 : 0.25,
            color: feature?.properties?.name === selectedRegionName ? "#1A2C42" : "#FFFFFF",
            weight: feature?.properties?.name === selectedRegionName ? 3 : 1.4,
          };
        },
        onEachFeature: (feature: any, layer: any) => {
          const name = feature?.properties?.name ?? "";
          const region = metricByName.get(name);
          layer.on({
            mouseover(event: any) {
              event.target.setStyle({ weight: 3, color: "#1A2C42", fillOpacity: 0.95 });
              event.target.bringToFront();
            },
            mouseout(event: any) {
              geoLayer.resetStyle(event.target);
            },
            click() {
              setSelectedRegionName(name);
              try { map.fitBounds(layer.getBounds(), { padding: [28, 28] }); } catch { /* noop */ }
            },
          });
          layer.bindTooltip(
            `<strong>${name}</strong><br/>${region ? formatMetric(region, indicator, activeIndicator.unit) : "Pas de donnees"}`,
            { sticky: true }
          );
        },
      }).addTo(map);

      if (layerState.markets || layerState.alerts || layerState.datasets || layerState.labels) {
        geojson.features.forEach((feature) => {
          const region = metricByName.get(feature.properties.name);
          if (!region) return;
          const bounds = L.geoJSON(feature as any).getBounds();
          if (!bounds.isValid()) return;
          const center = bounds.getCenter();

          if (layerState.labels) {
            L.marker(center, {
              icon: L.divIcon({
                className: "",
                html: `<div style="font-size:10px;font-weight:800;color:#1A2C42;text-align:center;text-shadow:0 0 4px white;white-space:nowrap">${region.name}</div>`,
              }),
            }).addTo(map);
          }
          if (layerState.markets && region.markets > 0) {
            L.circleMarker([center.lat + 0.06, center.lng - 0.08], {
              radius: Math.min(9, 4 + region.markets),
              color: "#FFFFFF",
              weight: 2,
              fillColor: "#E04E2F",
              fillOpacity: 0.9,
            }).addTo(map);
          }
          if (layerState.alerts && region.alert) {
            L.circleMarker([center.lat - 0.08, center.lng + 0.08], {
              radius: 8,
              color: "#FFFFFF",
              weight: 2,
              fillColor: region.alert.severity === "critical" ? "#DC2626" : "#D97706",
              fillOpacity: 0.95,
            }).addTo(map);
          }
          if (layerState.datasets && region.datasets > 0) {
            L.circleMarker([center.lat - 0.03, center.lng - 0.12], {
              radius: 6,
              color: "#FFFFFF",
              weight: 2,
              fillColor: "#2563EB",
              fillOpacity: 0.9,
            }).addTo(map);
          }
        });
      }

      map.fitBounds(geoLayer.getBounds(), { padding: [18, 18] });
      mapInstance.current = map;
    };

    init();
    return () => {
      cancelled = true;
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
      destroyLeafletContainer(mapRef.current);
    };
  }, [activeCommodity.threshold, activeIndicator.unit, geojson, indicator, layerState.alerts, layerState.datasets, layerState.labels, layerState.markets, metrics, selectedRegionName]);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#F4F6FA]">
      <div className="border-b border-gray-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>Tableaux de bord</span><span>/</span><span className="font-semibold text-gray-900">Carte interactive</span>
            </div>
            <h1 className="mt-1 text-xl font-bold text-gray-900">Carte interactive du Burkina Faso</h1>
          </div>
          <div className="hidden items-center gap-3 md:flex">
            <span className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#E04E2F]">GeoJSON · WFP · FasoData</span>
            <button className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-500">
              <Bell className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1600px] grid-cols-1 bg-white lg:grid-cols-[320px_minmax(520px,1fr)_340px]">
        <aside className="border-b border-gray-200 bg-white p-5 lg:border-b-0 lg:border-r">
          <h2 className="text-2xl font-semibold text-gray-900">Couches & filtres</h2>

          <section className="mt-7">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500">Indicateur affiché</h3>
            <div className="space-y-2">
              {INDICATORS.map((item) => (
                <button key={item.key} onClick={() => setIndicator(item.key)} className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition", indicator === item.key ? "bg-red-50 text-gray-900" : "text-gray-600 hover:bg-gray-50")}>
                  <span className={cn("flex h-5 w-5 items-center justify-center rounded-full border-4", indicator === item.key ? "border-[#E04E2F]" : "border-gray-200")} />
                  {item.label}
                </button>
              ))}
            </div>
          </section>

          {indicator === "prix_mais" && (
            <section className="mt-7">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500">Produit</h3>
              <div className="grid grid-cols-2 gap-2">
                {COMMODITIES.map((item) => (
                  <button key={item.key} onClick={() => setCommodity(item.key)} className={cn("rounded-xl border px-3 py-2 text-xs font-bold", commodity === item.key ? "border-[#E04E2F] bg-[#E04E2F] text-white" : "border-gray-200 text-gray-600")}>
                    {item.label}
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="mt-7">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500">Calques superposés</h3>
            <div className="space-y-3">
              {layers.map((layer) => (
                <button key={layer.key} onClick={() => setLayers((current) => current.map((item) => item.key === layer.key ? { ...item, enabled: !item.enabled } : item))} className="flex w-full items-center justify-between gap-3 text-left">
                  <span className="flex items-center gap-3 text-sm font-medium text-gray-700">
                    <span className={cn("flex h-6 w-10 rounded-full p-0.5 transition", layer.enabled ? "bg-[#E04E2F]" : "bg-gray-200")}>
                      <span className={cn("h-5 w-5 rounded-full bg-white shadow transition", layer.enabled ? "translate-x-4" : "translate-x-0")} />
                    </span>
                    {layer.label}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="mt-7">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500">Période</h3>
            <div className="grid grid-cols-4 gap-2">
              {PERIODS.map((item) => (
                <button key={item.key} onClick={() => setPeriod(item.key)} className={cn("rounded-lg border px-2 py-2 text-xs font-bold", period === item.key ? "border-[#1A2C42] bg-[#1A2C42] text-white" : "border-gray-200 bg-white text-gray-600")}>
                  {item.label}
                </button>
              ))}
            </div>
            <p className="mt-3 text-center text-xs text-gray-500">Depuis {start}</p>
          </section>

          <section className="mt-8 rounded-2xl bg-gray-50 p-4">
            <h3 className="mb-3 text-sm font-bold text-gray-900">{activeIndicator.label}</h3>
            <div className="h-4 rounded-full bg-gradient-to-r from-[#E7F4EC] via-[#FDE68A] via-[#F97316] to-[#DC2626]" />
            <div className="mt-2 flex justify-between text-xs text-gray-500">
              {activeIndicator.range.map((item) => <span key={item}>{item}</span>)}
            </div>
          </section>
        </aside>

        <main className="relative min-h-[720px] overflow-hidden bg-[#F8FAFC]">
          <div className="absolute left-5 right-5 top-5 z-[400] flex flex-wrap items-center gap-3">
            <button className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-gray-800 shadow-sm ring-1 ring-gray-200">
              <MapIcon className="h-4 w-4" /> Vue : choroplèthe <ChevronDown className="h-4 w-4 text-gray-400" />
            </button>
            <span className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-gray-800 shadow-sm ring-1 ring-gray-200">
              <SlidersHorizontal className="h-4 w-4" /> {visibleRegions} régions avec données
            </span>
            <span className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-gray-800 shadow-sm ring-1 ring-gray-200">
              <span className={cn("h-2.5 w-2.5 rounded-full", pricesFetching ? "bg-amber-500" : "bg-green-600")} /> {pricesFetching ? "Mise à jour..." : "Données synchronisées"}
            </span>
            <button onClick={() => csvExport(metrics, indicator)} className="ml-auto flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-gray-200" aria-label="Exporter les données de la carte en CSV">
              <Download className="h-4 w-4" />
            </button>
            <button onClick={() => refetch()} className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-gray-200" aria-label="Actualiser les données de la carte">
              <RefreshCw className={cn("h-4 w-4", pricesFetching && "animate-spin")} />
            </button>
          </div>

          <div ref={mapRef} className="absolute inset-0 z-0" />

          <div className="absolute bottom-5 left-5 z-[400] rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-gray-200">
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span className="h-1.5 w-20 rounded-full bg-[#1A2C42]" /> 100 km
            </div>
          </div>

          <div className="absolute bottom-5 right-5 z-[400] flex flex-col gap-2">
            <button className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-gray-200" aria-label="Zoomer sur la carte"><ZoomIn className="h-4 w-4" /></button>
            <button className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-gray-200" aria-label="Afficher les options de la carte"><MoreHorizontal className="h-4 w-4" /></button>
            <button onClick={() => setSelectedRegionName("Sahel")} className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-gray-200" aria-label="Réinitialiser la sélection de région"><RotateCcw className="h-4 w-4" /></button>
          </div>
        </main>

        <aside className="border-t border-gray-200 bg-white p-5 lg:border-l lg:border-t-0">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Région sélectionnée</p>
          <h2 className="mt-3 text-3xl font-semibold text-gray-900">{selectedRegion?.name ?? "Burkina Faso"}</h2>
          <p className="mt-2 text-sm text-gray-500">{selectedRegion?.capital || "Chef-lieu non renseigné"}</p>

          {selectedRegion?.alert && (
            <div className="mt-6 rounded-2xl border border-[#E04E2F] bg-red-50 p-4">
              <p className="flex items-center gap-2 text-sm font-bold uppercase text-[#E04E2F]">
                <AlertTriangle className="h-4 w-4" /> Alerte active
              </p>
              <p className="mt-2 text-sm leading-6 text-gray-800">{selectedRegion.alert.title}</p>
              <p className="mt-1 text-xs font-semibold text-[#E04E2F]">{selectedRegion.alert.value}</p>
            </div>
          )}

          <div className="mt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Valeur affichée</p>
              <span className="text-xs font-bold text-[#E04E2F]">{activeIndicator.label}</span>
            </div>
            <p className="mt-3 text-4xl font-bold text-gray-900">
              {selectedRegion ? formatMetric(selectedRegion, indicator, activeIndicator.unit) : "-"}
            </p>
            {indicator === "prix_mais" && selectedRegion?.priceDate && (
              <p className="mt-2 text-xs text-gray-400">Dernière observation : {selectedRegion.priceDate}</p>
            )}
          </div>

          <div className="mt-6 border-t border-gray-100 pt-5">
            <div className="mb-3 flex items-center gap-2">
              <Layers className="h-4 w-4 text-[#E04E2F]" />
              <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500">Indicateurs régionaux</h3>
            </div>
            {selectedRegion && [
              ["Prix", selectedRegion.price ? `${Math.round(selectedRegion.price)} CFA/kg` : "Pas de données", "text-[#E04E2F]"],
              ["Phase IPC estimée", `Phase ${selectedRegion.ipcPhase}`, "text-amber-600"],
              ["Marchés suivis", selectedRegion.markets, "text-gray-900"],
              ["Datasets géo", selectedRegion.datasets, "text-blue-600"],
              ["Alertes", selectedRegion.alert ? "Active" : "Aucune", selectedRegion.alert ? "text-[#E04E2F]" : "text-green-700"],
            ].map(([label, value, color]) => (
              <div key={label} className="flex items-center justify-between border-b border-gray-100 py-2 text-sm">
                <span className="max-w-[150px] text-gray-600">{label}</span>
                <span className={cn("font-bold", color as string)}>{value}</span>
              </div>
            ))}
          </div>

          <button onClick={() => csvExport(metrics, indicator)} className="mt-6 w-full rounded-xl bg-[#E04E2F] px-4 py-3 text-sm font-bold text-white">
            Exporter les données
          </button>
          <a href="/dashboard/prix" className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-700">
            <MapPin className="h-4 w-4" /> Analyse prix détaillée
          </a>
        </aside>
      </div>
    </div>
  );
}
