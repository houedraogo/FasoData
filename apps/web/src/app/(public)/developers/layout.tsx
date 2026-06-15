import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "API Développeurs",
  description:
    "Intégrez les données ouvertes du Burkina Faso dans vos applications. API REST, authentification JWT, exemples curl et SDK. Documentation complète disponible.",
  openGraph: {
    title: "API Développeurs — FasoData",
    description:
      "API REST pour accéder aux données ouvertes du Burkina Faso. Auth JWT, pagination, filtres, formats JSON/CSV.",
    url: "https://fasodata.com/developers",
    siteName: "FasoData",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "API Développeurs — FasoData",
    description: "API REST pour les données ouvertes du Burkina Faso.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
