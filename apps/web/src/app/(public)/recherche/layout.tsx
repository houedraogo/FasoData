import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Recherche",
  description:
    "Recherchez parmi les données ouvertes du Burkina Faso : filtrez par catégorie, format, licence et source. Accès libre, téléchargement immédiat.",
  openGraph: {
    title: "Recherche — FasoData",
    description: "Recherche avancée dans les données ouvertes du Burkina Faso.",
    url: "https://fasodata.com/recherche",
    siteName: "FasoData",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Recherche — FasoData",
    description: "Recherche avancée dans les données ouvertes du Burkina Faso.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
