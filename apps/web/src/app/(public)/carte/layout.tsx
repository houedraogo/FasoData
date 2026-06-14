import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Carte interactive",
  description:
    "Visualisez les données géospatiales du Burkina Faso sur une carte interactive : régions, provinces, indicateurs géolocalisés et couches thématiques.",
  openGraph: {
    title: "Carte interactive — FasoData",
    description:
      "Carte des données géospatiales du Burkina Faso : régions, provinces et indicateurs thématiques.",
    url: "https://fasodata.bf/carte",
    siteName: "FasoData",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Carte interactive — FasoData",
    description: "Données géospatiales du Burkina Faso en carte interactive.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
