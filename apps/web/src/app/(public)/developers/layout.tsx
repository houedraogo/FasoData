import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "API Développeurs — Données ouvertes Burkina Faso",
  description:
    "API REST pour intégrer les données ouvertes du Burkina Faso dans vos applications. Prix alimentaires, datasets agricoles, indicateurs socioéconomiques — authentification JWT, formats JSON/CSV, documentation Swagger.",
  keywords: [
    "API Burkina Faso données",
    "API REST données ouvertes Burkina",
    "API prix alimentaires Burkina Faso",
    "intégrer données Burkina Faso",
    "API JSON CSV Burkina",
    "API open data Afrique",
    "développeur données Burkina Faso",
    "SDK données Burkina Faso",
    "API agriculture Burkina Faso",
    "données machine readable Burkina",
  ],
  alternates: { canonical: "/developers" },
  openGraph: {
    title: "API Développeurs — FasoData Burkina Faso",
    description:
      "API REST pour accéder aux données ouvertes du Burkina Faso : prix alimentaires, agriculture, indicateurs. Auth JWT, JSON/CSV, documentation Swagger complète.",
    url: "https://fasodata.com/developers",
    siteName: "FasoData",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "API Développeurs — FasoData",
    description: "API REST open data Burkina Faso. Prix alimentaires, agriculture, indicateurs. JSON/CSV, auth JWT.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
