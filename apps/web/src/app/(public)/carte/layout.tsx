import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Carte interactive des données — Burkina Faso",
  description:
    "Explorez les données géospatiales du Burkina Faso sur une carte interactive : 13 régions, 45 provinces, indicateurs socioéconomiques géolocalisés, couches agriculture, santé, éducation et économie.",
  keywords: [
    "carte Burkina Faso données",
    "carte interactive Burkina Faso",
    "carte régions Burkina Faso",
    "données géospatiales Burkina Faso",
    "carte agriculture Burkina Faso",
    "carte provinces Burkina Faso",
    "GIS Burkina Faso",
    "cartographie Afrique de l'Ouest",
    "indicateurs régionaux Burkina Faso",
    "visualisation données géographiques Burkina",
  ],
  alternates: { canonical: "/carte" },
  openGraph: {
    title: "Carte interactive — FasoData Burkina Faso",
    description:
      "Carte des 13 régions du Burkina Faso avec indicateurs socioéconomiques : agriculture, santé, éducation, économie. Données géospatiales vérifiées.",
    url: "https://fasodata.com/carte",
    siteName: "FasoData",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Carte interactive — FasoData",
    description: "Carte des données géospatiales du Burkina Faso : 13 régions, indicateurs thématiques.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
