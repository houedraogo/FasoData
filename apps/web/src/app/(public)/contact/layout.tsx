import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contactez l'équipe FasoData : questions sur les données ouvertes du Burkina Faso, partenariats ONG, accès institutionnel, étude de marché ou collecte terrain. Réponse sous 48h.",
  keywords: [
    "contact FasoData",
    "partenariat données Burkina Faso",
    "accès données ONG Burkina",
    "demande étude de marché Burkina Faso",
    "collecte données terrain Burkina",
  ],
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact — FasoData",
    description: "Contactez FasoData pour vos questions sur les données ouvertes du Burkina Faso, partenariats, accès institutionnel ou étude de marché.",
    url: "https://fasodata.com/contact",
    siteName: "FasoData",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Contact — FasoData",
    description: "Contactez FasoData : données ouvertes Burkina Faso, partenariats, accès institutionnel.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
