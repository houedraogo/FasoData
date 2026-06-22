import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description:
    "Politique de confidentialité de FasoData : traitement des données personnelles, RGPD, cookies et droits des utilisateurs sur la plateforme open data Burkina Faso.",
  alternates: { canonical: "/confidentialite" },
  robots: { index: true, follow: false },
  openGraph: {
    title: "Politique de confidentialité — FasoData",
    description: "Données personnelles, RGPD, cookies et droits des utilisateurs FasoData.",
    url: "https://fasodata.com/confidentialite",
    siteName: "FasoData",
    type: "website",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
