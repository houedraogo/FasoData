import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Catalogue de données ouvertes — Burkina Faso",
  description:
    "Téléchargez les datasets publics du Burkina Faso : prix alimentaires, agriculture, santé, éducation, économie, géographie. Données WFP, SONAGESS, INSD vérifiées. Formats CSV, JSON, API REST.",
  keywords: [
    "datasets Burkina Faso",
    "données ouvertes Burkina Faso",
    "télécharger données Burkina",
    "données agriculture Burkina Faso",
    "données santé Burkina Faso",
    "données économie Burkina Faso",
    "WFP données Burkina HDX",
    "SONAGESS statistiques",
    "INSD Burkina Faso",
    "open data Afrique de l'Ouest",
    "API données CSV JSON Burkina",
    "indicateurs développement Burkina",
  ],
  alternates: { canonical: "/datasets" },
  openGraph: {
    title: "Catalogue de données ouvertes — FasoData Burkina Faso",
    description:
      "Datasets vérifiés du Burkina Faso : agriculture, prix alimentaires, santé, éducation. Sources WFP, SONAGESS, INSD. Téléchargement CSV/JSON, API REST.",
    url: "https://fasodata.com/datasets",
    siteName: "FasoData",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Catalogue open data — FasoData",
    description: "Datasets Burkina Faso : agriculture, santé, économie. Formats CSV/JSON, API REST. Sources WFP, SONAGESS, INSD.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
