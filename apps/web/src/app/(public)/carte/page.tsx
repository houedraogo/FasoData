"use client";

import dynamic from "next/dynamic";

const MapComponent = dynamic(() => import("@/components/maps/BurkinaMap"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[720px] flex-1 items-center justify-center bg-gray-100">
      <p className="text-gray-400">Chargement de la carte...</p>
    </div>
  ),
});

export default function CartePage() {
  return (
    <div className="min-h-screen bg-[#F4F6FA]">
      <MapComponent />
    </div>
  );
}
