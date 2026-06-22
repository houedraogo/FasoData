import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Carte des prix alimentaires — Burkina Faso",
  description:
    "Prix des céréales et denrées alimentaires par région au Burkina Faso en temps réel. Sorgho, maïs, mil, riz, niébé, arachide — données WFP/SONAGESS actualisées chaque semaine. Visualisation par marchés.",
  keywords: [
    "prix alimentaires Burkina Faso carte",
    "prix céréales Burkina Faso 2024",
    "prix sorgho Burkina Faso",
    "prix maïs Burkina Faso",
    "prix mil Burkina Faso",
    "prix riz Burkina Faso",
    "prix niébé Burkina Faso",
    "prix arachide Burkina Faso",
    "marchés céréaliers Burkina Faso",
    "prix marché Ouagadougou",
    "prix marché Bobo-Dioulasso",
    "sécurité alimentaire Burkina Faso",
    "inflation alimentaire Sahel",
    "données WFP SONAGESS prix",
    "carte prix marchés Afrique de l'Ouest",
  ],
  alternates: { canonical: "/carte-prix" },
  openGraph: {
    title: "Carte des prix alimentaires — FasoData Burkina Faso",
    description:
      "Prix du sorgho, maïs, mil, riz et niébé par région au Burkina Faso. Données WFP/SONAGESS actualisées, visualisation cartographique des marchés.",
    url: "https://fasodata.com/carte-prix",
    siteName: "FasoData",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Carte des prix alimentaires — FasoData",
    description: "Prix céréales par région au Burkina Faso. Sorgho, maïs, mil, riz — données WFP/SONAGESS.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
