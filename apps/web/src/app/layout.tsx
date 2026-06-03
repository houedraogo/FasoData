import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";
import PWARegistration  from "@/components/pwa/PWARegistration";
import InstallBanner    from "@/components/pwa/InstallBanner";
import OfflineIndicator from "@/components/pwa/OfflineIndicator";

export const metadata: Metadata = {
  title: {
    default: "FasoData — Plateforme de données ouvertes du Burkina Faso",
    template: "%s | FasoData",
  },
  description:
    "Accédez, explorez et partagez des données ouvertes sur le Burkina Faso. Agriculture, santé, éducation, géographie et plus.",
  keywords: ["open data", "Burkina Faso", "données ouvertes", "statistiques", "Africa", "prix alimentaires"],
  openGraph: {
    siteName: "FasoData",
    locale:   "fr_BF",
  },
  // PWA
  manifest: "/manifest.json",
  appleWebApp: {
    capable:       true,
    statusBarStyle: "black-translucent",
    title:         "FasoData",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor:          "#1A2C42",
  width:               "device-width",
  initialScale:        1,
  maximumScale:        5,
  userScalable:        true,
  viewportFit:         "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="icon"             href="/icons/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icons/icon.svg" />
        <link rel="manifest"         href="/manifest.json" />
        <meta name="mobile-web-app-capable"        content="yes" />
        <meta name="apple-mobile-web-app-capable"  content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body>
        <Providers>
          {children}
          {/* Composants PWA — invisibles, gèrent le SW et les notifications */}
          <PWARegistration />
          <InstallBanner />
          <OfflineIndicator />
        </Providers>
      </body>
    </html>
  );
}
