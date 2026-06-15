import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Catalogue de données",
  description:
    "Explorez et téléchargez les datasets publics du Burkina Faso : agriculture, santé, éducation, économie, géographie et bien plus. Données fiables, formats ouverts.",
  openGraph: {
    title: "Catalogue de données — FasoData",
    description:
      "Datasets ouverts du Burkina Faso : agriculture, santé, éducation, économie et plus. Téléchargement libre, API disponible.",
    url: "https://fasodata.com/datasets",
    siteName: "FasoData",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Catalogue de données — FasoData",
    description: "Datasets ouverts du Burkina Faso, formats CSV/JSON, API REST.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
