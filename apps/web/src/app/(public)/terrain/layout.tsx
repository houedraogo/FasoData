import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Collecte terrain — Enquêteur prix",
  description:
    "Application de collecte des prix alimentaires sur les marchés du Burkina Faso. Devenez enquêteur terrain FasoData : relevez les prix du sorgho, maïs, mil, riz et niébé dans votre marché local.",
  keywords: [
    "enquêteur terrain Burkina Faso",
    "collecte prix marchés Burkina",
    "relever prix alimentaires Burkina Faso",
    "contributeur données prix céréales",
    "saisie prix marché local Burkina",
  ],
  alternates: { canonical: "/terrain" },
  openGraph: {
    title: "Collecte terrain — FasoData",
    description: "Relevez les prix alimentaires dans votre marché local et contribuez à la base de données ouverte du Burkina Faso.",
    url: "https://fasodata.com/terrain",
    siteName: "FasoData",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Collecte terrain — FasoData",
    description: "Enquêteurs terrain : relevez les prix alimentaires au Burkina Faso.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
