import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Guide d'utilisation",
  description:
    "Apprenez à utiliser FasoData : recherche de datasets, téléchargement, API, publication de données. Guide pour chercheurs, ONG, entreprises et institutions.",
  openGraph: {
    title: "Guide d'utilisation — FasoData",
    description:
      "Guide complet pour utiliser FasoData : recherche, téléchargement, API et publication de données ouvertes.",
    url: "https://fasodata.com/guide",
    siteName: "FasoData",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Guide d'utilisation — FasoData",
    description: "Guide pour chercheurs, ONG, entreprises et institutions.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
