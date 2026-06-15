import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Carte des prix alimentaires",
  description:
    "Suivez l'évolution des prix des céréales et denrées alimentaires par région au Burkina Faso. Données WFP/SONAGESS actualisées, visualisation cartographique.",
  openGraph: {
    title: "Carte des prix alimentaires — FasoData",
    description:
      "Prix des céréales et denrées alimentaires par région au Burkina Faso, données WFP/SONAGESS.",
    url: "https://fasodata.com/carte-prix",
    siteName: "FasoData",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Carte des prix alimentaires — FasoData",
    description: "Prix alimentaires par région au Burkina Faso, données actualisées.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
