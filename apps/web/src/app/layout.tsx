import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";
import PWARegistration from "@/components/pwa/PWARegistration";
import InstallBanner from "@/components/pwa/InstallBanner";
import OfflineIndicator from "@/components/pwa/OfflineIndicator";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://fasodata.com";
const siteDescription =
  "FasoData — plateforme open data de référence au Burkina Faso. Prix alimentaires en temps réel, datasets publics vérifiés, carte des marchés, indicateurs d'impact pour ONG, entreprises, investisseurs et institutions.";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: "FasoData",
      url: siteUrl,
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/icons/icon.svg`,
      },
      description: siteDescription,
      foundingLocation: {
        "@type": "Place",
        name: "Burkina Faso",
      },
      areaServed: {
        "@type": "Country",
        name: "Burkina Faso",
      },
      knowsAbout: [
        "Open Data",
        "Prix alimentaires Burkina Faso",
        "Données agricoles Afrique de l'Ouest",
        "Étude de marché Burkina Faso",
        "Indicateurs socioéconomiques",
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: "FasoData",
      publisher: { "@id": `${siteUrl}/#organization` },
      inLanguage: ["fr", "en"],
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${siteUrl}/recherche?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "DataCatalog",
      "@id": `${siteUrl}/#datacatalog`,
      name: "Catalogue de données FasoData",
      url: `${siteUrl}/datasets`,
      description:
        "Catalogue de datasets ouverts sur le Burkina Faso : agriculture, prix alimentaires, santé, éducation, économie, géographie.",
      publisher: { "@id": `${siteUrl}/#organization` },
      spatialCoverage: {
        "@type": "Country",
        name: "Burkina Faso",
        identifier: "BF",
      },
      keywords: [
        "prix alimentaires Burkina Faso",
        "données sorgho maïs mil",
        "marchés alimentaires Sahel",
        "open data Afrique de l'Ouest",
      ],
    },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "FasoData",
  title: {
    default: "FasoData — Open Data & Prix Alimentaires Burkina Faso",
    template: "%s | FasoData",
  },
  description: siteDescription,
  keywords: [
    // Marque
    "FasoData",
    // Géographie
    "Burkina Faso",
    "Ouagadougou",
    "Bobo-Dioulasso",
    "Sahel Burkina Faso",
    "Afrique de l'Ouest",
    "UEMOA",
    "CEDEAO",
    // Open data
    "données ouvertes",
    "open data Burkina Faso",
    "données publiques Burkina Faso",
    "datasets Burkina Faso",
    "données gratuites Burkina",
    "API données Burkina Faso",
    // Prix alimentaires
    "prix alimentaires Burkina Faso",
    "prix céréales Burkina Faso",
    "prix sorgho Burkina Faso",
    "prix maïs Burkina Faso",
    "prix mil Burkina Faso",
    "prix riz Burkina Faso",
    "prix niébé Burkina Faso",
    "prix arachide Burkina Faso",
    "prix marchés Ouagadougou",
    "prix marchés Bobo-Dioulasso",
    "sécurité alimentaire Burkina Faso",
    "marché alimentaire Sahel",
    "inflation alimentaire Burkina",
    // Organisations & sources
    "WFP Burkina Faso",
    "PAM Burkina Faso",
    "SONAGESS",
    "INSD Burkina Faso",
    "données WFP HDX",
    "humanitarian data exchange",
    // Études de marché / entreprises
    "étude de marché Burkina Faso",
    "analyse marché agroalimentaire",
    "import export Burkina Faso",
    "investissement agricole Burkina Faso",
    "filière céréales Burkina Faso",
    "distribution alimentaire Burkina Faso",
    // ONG & institutions
    "données ONG Burkina Faso",
    "indicateurs impact social",
    "monitoring évaluation ONG",
    "données humanitaires Burkina",
    "cartographie projets ONG",
    // Secteurs
    "agriculture Burkina Faso",
    "santé Burkina Faso",
    "éducation Burkina Faso",
    "économie Burkina Faso",
    "géographie Burkina Faso",
    // Technique
    "API REST Burkina Faso",
    "données CSV Excel Burkina Faso",
    "cartographie données Burkina",
    "visualisation données Afrique",
    "tableau de bord ONG",
  ],
  authors: [{ name: "FasoData", url: siteUrl }],
  creator: "FasoData",
  publisher: "FasoData",
  category: "données ouvertes, agriculture, économie",
  classification: "Open Data Platform",
  alternates: {
    canonical: "/",
    languages: {
      "fr-BF": "/",
      "fr": "/",
      "en": "/?lang=en",
    },
  },
  openGraph: {
    title: "FasoData — Open Data & Prix Alimentaires Burkina Faso",
    description: siteDescription,
    url: siteUrl,
    siteName: "FasoData",
    locale: "fr_BF",
    alternateLocale: ["fr_FR", "en_US"],
    type: "website",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "FasoData — Plateforme open data Burkina Faso : prix alimentaires, datasets et carte des marchés",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FasoData — Open Data & Prix Alimentaires Burkina Faso",
    description: siteDescription,
    images: ["/opengraph-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: [
      { url: "/picto.png", type: "image/png" },
      { url: "/icons/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/picto.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FasoData",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#1A2C42",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="icon" href="/icons/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icons/icon.svg" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <Providers>
          {children}
          {/* PWA components: service worker, install prompt and offline status. */}
          <PWARegistration />
          <InstallBanner />
          <OfflineIndicator />
        </Providers>
      </body>
    </html>
  );
}
