import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";
import PWARegistration from "@/components/pwa/PWARegistration";
import InstallBanner from "@/components/pwa/InstallBanner";
import OfflineIndicator from "@/components/pwa/OfflineIndicator";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://fasodata.com";
const siteDescription =
  "Explorez les donnees fiables du Burkina Faso : prix alimentaires, cartes regionales, datasets publics, indicateurs d'impact et API pour chercheurs, ONG, entreprises et institutions.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "FasoData",
  title: {
    default: "FasoData - Donnees fiables sur le Burkina Faso",
    template: "%s | FasoData",
  },
  description: siteDescription,
  keywords: [
    "FasoData",
    "Burkina Faso",
    "donnees ouvertes",
    "open data Burkina Faso",
    "prix alimentaires",
    "WFP",
    "cartographie",
    "datasets publics",
    "indicateurs ONG",
    "etude de marche",
  ],
  authors: [{ name: "FasoData" }],
  creator: "FasoData",
  publisher: "FasoData",
  alternates: {
    canonical: "/",
    languages: {
      fr: "/",
      en: "/?lang=en",
    },
  },
  openGraph: {
    title: "FasoData - Donnees fiables sur le Burkina Faso",
    description: siteDescription,
    url: siteUrl,
    siteName: "FasoData",
    locale: "fr_BF",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Apercu de la plateforme FasoData",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FasoData - Donnees fiables sur le Burkina Faso",
    description: siteDescription,
    images: ["/opengraph-image"],
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
