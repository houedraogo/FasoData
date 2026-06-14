import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "À propos",
  description:
    "FasoData est la plateforme de référence pour les données ouvertes du Burkina Faso. Découvrez notre mission, notre équipe et notre engagement pour la transparence des données.",
  openGraph: {
    title: "À propos — FasoData",
    description:
      "Découvrez FasoData : mission, équipe et engagement pour les données ouvertes du Burkina Faso.",
    url: "https://fasodata.bf/a-propos",
    siteName: "FasoData",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "À propos — FasoData",
    description: "Mission et équipe FasoData, plateforme open data Burkina Faso.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
