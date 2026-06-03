"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef } from "react";

interface RegionPrice { region: string; price: number; commodity: string; }
interface ChoroplethPrixProps {
  prices:    RegionPrice[];
  commodity: string;
  seuil:     number;
  unit?:     string;
  onRegionClick?: (region: string) => void;
}

function priceToColor(price: number, seuil: number): string {
  if (price <= 0 || seuil <= 0) return "#E5E7EB";
  const r = price / seuil;
  if (r < 0.70) return "#166534";
  if (r < 0.85) return "#16A34A";
  if (r < 0.95) return "#86EFAC";
  if (r < 1.05) return "#FDE68A";
  if (r < 1.15) return "#F97316";
  return "#DC2626";
}

// ── Helper : supprime proprement l'état Leaflet sur un élément DOM ─────────────
function destroyLeafletContainer(el: HTMLElement | null) {
  if (!el) return;
  // Leaflet stocke l'ID sur l'élément — on le supprime avant réinitialisation
  delete (el as any)._leaflet_id;
  delete (el as any)._leaflet;
  // Vider les enfants générés par Leaflet (panes, etc.)
  el.innerHTML = "";
}

export default function ChoroplethPrix({
  prices, commodity, seuil, unit = "CFA/kg", onRegionClick,
}: ChoroplethPrixProps) {
  const mapRef      = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);

  const priceMap = Object.fromEntries(prices.map((p) => [p.region, p.price]));

  useEffect(() => {
    if (typeof window === "undefined" || !mapRef.current) return;

    // ── Flag d'annulation — résout la race condition async ────────────────────
    // Sans ce flag : si `prices` change pendant l'init async (fetch GeoJSON),
    // la première init continue en parallèle de la seconde → double map.
    let cancelled = false;

    const initMap = async () => {
      const L = (await import("leaflet")).default;

      if (cancelled) return;

      // CSS Leaflet — injection unique
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id   = "leaflet-css";
        link.rel  = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      // Supprimer toute instance précédente + nettoyer le container DOM
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
      destroyLeafletContainer(mapRef.current);

      if (cancelled || !mapRef.current) return;

      // Créer la carte
      const map = L.map(mapRef.current, {
        center: [12.4, -1.5],
        zoom: 6,
        zoomControl: true,
        scrollWheelZoom: false,
        attributionControl: false,
      });

      // Fond discret CartoDB
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
      }).addTo(map);

      // GeoJSON Burkina Faso
      let geojson: any;
      try {
        const resp = await fetch("/geojson/burkina-regions.geojson");
        if (!resp.ok) throw new Error("GeoJSON non trouvé");
        geojson = await resp.json();
      } catch {
        console.error("[ChoroplethPrix] GeoJSON Burkina introuvable");
        return;
      }

      if (cancelled) {
        map.remove();
        return;
      }

      // ── Info-bulle flottante ────────────────────────────────────────────────
      const InfoControl = (L.Control as any).extend({
        onAdd() {
          const div = L.DomUtil.create("div");
          div.style.cssText = "padding:10px 14px;background:white;border-radius:12px;min-width:180px;" +
            "font-size:12px;font-family:sans-serif;box-shadow:0 2px 12px rgba(0,0,0,0.15);pointer-events:none";
          div.innerHTML = "<strong style='color:#1A2C42'>Survolez une région</strong>";
          this._div = div;
          return div;
        },
        update(regionName?: string) {
          if (!this._div) return;
          if (!regionName) {
            this._div.innerHTML = "<strong style='color:#1A2C42'>Survolez une région</strong>";
            return;
          }
          const price = priceMap[regionName] ?? 0;
          const color = priceToColor(price, seuil);
          const ratio = price && seuil ? (price / seuil) : null;
          const pct   = ratio ? `${Math.round(ratio * 100)}% du seuil` : "";
          this._div.innerHTML = `
            <div style="font-weight:700;color:#1A2C42;font-size:13px;margin-bottom:2px">${regionName}</div>
            ${price
              ? `<div style="display:flex;align-items:center;gap:6px;margin-top:6px">
                   <span style="width:12px;height:12px;border-radius:50%;background:${color};display:inline-block"></span>
                   <strong style="font-size:15px;color:#111">${price} ${unit}</strong>
                 </div>
                 <div style="color:#999;font-size:10px;margin-top:2px">${pct}</div>`
              : `<div style="color:#aaa;font-size:11px;margin-top:4px">Pas de données</div>`}
          `;
        },
      });

      const infoControl = new InfoControl({ position: "topright" });
      infoControl.addTo(map);

      // ── Couche GeoJSON choroplèthe ──────────────────────────────────────────
      const geoLayer = L.geoJSON(geojson, {
        style: (feature: any) => {
          const price = priceMap[feature?.properties?.name ?? ""] ?? 0;
          return {
            fillColor:   priceToColor(price, seuil),
            fillOpacity: price > 0 ? 0.78 : 0.20,
            color:       "#FFFFFF",
            weight:      1.5,
          };
        },
        onEachFeature: (feature: any, layer: any) => {
          const name    = feature?.properties?.name ?? "";
          const capital = feature?.properties?.capital ?? "";
          const price   = priceMap[name] ?? 0;

          layer.on({
            mouseover(e: any) {
              e.target.setStyle({ weight: 3, color: "#1A2C42", fillOpacity: 0.92 });
              e.target.bringToFront();
              infoControl.update(name);
            },
            mouseout(e: any) {
              geoLayer.resetStyle(e.target);
              infoControl.update();
            },
            click() {
              try { map.fitBounds(layer.getBounds(), { padding: [40, 40] }); } catch { /* skip */ }
              onRegionClick?.(name);
            },
          });

          layer.bindTooltip(
            `<div style='font-weight:700;font-size:12px'>${name}</div>` +
            `<div style='font-size:10px;color:#888'>${capital}</div>` +
            (price ? `<div style='color:#E04E2F;font-weight:700;font-size:13px'>${price} ${unit}</div>` : `<div style='color:#aaa'>—</div>`),
            { sticky: true, className: "leaflet-prix-tooltip" }
          );
        },
      });

      geoLayer.addTo(map);

      // ── Labels des régions ──────────────────────────────────────────────────
      geojson.features.forEach((f: any) => {
        try {
          const bounds = L.geoJSON(f).getBounds();
          if (!bounds.isValid()) return;
          const center = bounds.getCenter();
          const name   = f.properties?.name ?? "";
          const price  = priceMap[name];

          L.marker(center, {
            icon: L.divIcon({
              className: "",
              html: `<div style="
                font-size:9px;font-weight:700;color:#1A2C42;
                text-align:center;pointer-events:none;white-space:nowrap;
                text-shadow:0 0 3px #fff,0 0 3px #fff,0 0 4px #fff;
                line-height:1.3;
              ">${name}${price ? `<br><span style="color:#E04E2F;font-size:10px">${price}</span>` : ""}</div>`,
              iconAnchor: [0, 0],
            }),
          }).addTo(map);
        } catch { /* skip */ }
      });

      mapInstance.current = map;
    };

    initMap();

    // ── Cleanup — s'exécute avant chaque ré-exécution ET au démontage ─────────
    return () => {
      cancelled = true;
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
      // Nettoyer aussi le container DOM pour éviter l'erreur Leaflet
      destroyLeafletContainer(mapRef.current);
    };
  // Recréer la carte uniquement quand les données ou le seuil changent
  }, [prices, seuil]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <style>{`
        .leaflet-prix-tooltip {
          background: white !important;
          border: 1px solid #e5e7eb !important;
          border-radius: 10px !important;
          padding: 7px 11px !important;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1) !important;
          font-family: sans-serif;
        }
        .leaflet-prix-tooltip::before { display: none !important; }
      `}</style>
      <div ref={mapRef} style={{ width: "100%", height: "100%", minHeight: "400px" }} />
    </>
  );
}
