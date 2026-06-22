import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "À propos — Plateforme open data Burkina Faso",
  description:
    "FasoData est la plateforme de référence pour les données ouvertes du Burkina Faso. Mission : rendre les données agricoles, économiques et sociales accessibles aux ONG, institutions, entreprises et chercheurs.",
  keywords: [
    "FasoData à propos",
    "plateforme open data Burkina Faso",
    "données ouvertes Burkina Faso mission",
    "transparence données Burkina",
    "données agricoles Burkina Faso",
    "données publiques Burkina gratuit",
    "Burkina Faso open data initiative",
  ],
  alternates: { canonical: "/a-propos" },
  openGraph: {
    title: "À propos — FasoData",
    description:
      "FasoData : mission, équipe et engagement pour les données ouvertes du Burkina Faso. Données vérifiées pour ONG, institutions, entreprises et chercheurs.",
    url: "https://fasodata.com/a-propos",
    siteName: "FasoData",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "À propos — FasoData",
    description: "Mission et équipe FasoData — plateforme open data de référence au Burkina Faso.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
