import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Conditions d'utilisation",
  description:
    "Conditions générales d'utilisation de la plateforme FasoData : accès aux données ouvertes du Burkina Faso, licences, droits d'usage et responsabilités.",
  alternates: { canonical: "/conditions" },
  robots: { index: true, follow: false },
  openGraph: {
    title: "Conditions d'utilisation — FasoData",
    description: "CGU de FasoData : licences, droits d'usage et accès aux données ouvertes du Burkina Faso.",
    url: "https://fasodata.com/conditions",
    siteName: "FasoData",
    type: "website",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
