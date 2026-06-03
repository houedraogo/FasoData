"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Locale = "fr" | "en";

type TranslationValue = string | string[];
type TranslationDictionary = Record<string, TranslationValue>;

const STORAGE_KEY = "fasodata.locale";

const dictionaries: Record<Locale, TranslationDictionary> = {
  fr: {
    "nav.datasets": "Explorer les donnees",
    "nav.map": "Carte interactive",
    "nav.priceMap": "Carte des prix",
    "nav.api": "API",
    "nav.about": "A propos",
    "nav.contact": "Contact",
    "nav.signIn": "Connexion",
    "nav.signUp": "S'inscrire",
    "nav.workspace": "Mon espace",
    "nav.languageLabel": "Langue",

    "footer.tagline": "La plateforme de reference pour les donnees ouvertes du Burkina Faso.",
    "footer.platform": "Plateforme",
    "footer.explore": "Explorer",
    "footer.publicApi": "API publique",
    "footer.statistics": "Statistiques",
    "footer.organization": "Organisation",
    "footer.partners": "Partenaires",
    "footer.legal": "Mentions legales",
    "footer.contribute": "Contribuer",
    "footer.publish": "Publier des donnees",
    "footer.docs": "Documentation",
    "footer.rights": "Donnees libres sous licence ouverte.",
    "footer.status": "Systeme operationnel",

    "home.badge": "Plateforme officielle des donnees ouvertes",
    "home.titleStart": "Les donnees du",
    "home.titleEnd": "accessibles a tous",
    "home.description":
      "FasoData centralise et diffuse les donnees publiques du Burkina Faso. Agriculture, sante, education, economie - explorez, analysez et partagez des donnees fiables pour un developpement eclaire.",
    "home.exploreCta": "Explorer les donnees",
    "home.mapCta": "Carte interactive",
    "home.stats.datasets": "Jeux de donnees",
    "home.stats.categories": "Categories thematiques",
    "home.stats.partners": "Organisations partenaires",
    "home.stats.downloads": "Telechargements mensuels",
    "home.categoriesTitle": "Explorez par thematique",
    "home.categoriesSubtitle": "Des donnees organisees par secteur pour faciliter votre recherche",
    "home.allCategories": "Voir toutes les categories",
    "home.datasetsLabel": "datasets",
    "home.featuresTitle": "Tout ce dont vous avez besoin",
    "home.featuresSubtitle":
      "Une plateforme complete pour acceder, analyser et partager les donnees publiques du Burkina Faso",
    "home.ctaTitle": "Vous avez des donnees a partager ?",
    "home.ctaText":
      "Rejoignez les organisations qui contribuent a l'ecosysteme de donnees ouvertes du Burkina Faso.",
    "home.ctaAccount": "Creer un compte institutionnel",
    "home.ctaContact": "Nous contacter",

    "home.feature.search.title": "Recherche avancee",
    "home.feature.search.description":
      "Trouvez exactement ce dont vous avez besoin grace a notre moteur de recherche full-text et nos filtres thematiques.",
    "home.feature.map.title": "Visualisation cartographique",
    "home.feature.map.description":
      "Explorez les donnees geospatiales du Burkina Faso sur une carte interactive alimentee par OpenStreetMap.",
    "home.feature.charts.title": "Analyses et graphiques",
    "home.feature.charts.description":
      "Visualisez les donnees directement en ligne avec des tableaux, courbes et histogrammes interactifs.",
    "home.feature.export.title": "Export multi-format",
    "home.feature.export.description":
      "Telechargez les donnees en CSV, XLSX ou JSON. Accedez egalement via notre API REST documentee.",
    "home.feature.verified.title": "Donnees verifiees",
    "home.feature.verified.description":
      "Chaque jeu de donnees est valide par notre equipe avant publication pour garantir qualite et fiabilite.",
    "home.feature.open.title": "Open Data",
    "home.feature.open.description":
      "Toutes les donnees publiques sont accessibles librement sous licences ouvertes, sans inscription.",
  },
  en: {
    "nav.datasets": "Explore data",
    "nav.map": "Interactive map",
    "nav.priceMap": "Price map",
    "nav.api": "API",
    "nav.about": "About",
    "nav.contact": "Contact",
    "nav.signIn": "Sign in",
    "nav.signUp": "Create account",
    "nav.workspace": "Workspace",
    "nav.languageLabel": "Language",

    "footer.tagline": "The reference platform for open data in Burkina Faso.",
    "footer.platform": "Platform",
    "footer.explore": "Explore",
    "footer.publicApi": "Public API",
    "footer.statistics": "Statistics",
    "footer.organization": "Organization",
    "footer.partners": "Partners",
    "footer.legal": "Legal notice",
    "footer.contribute": "Contribute",
    "footer.publish": "Publish data",
    "footer.docs": "Documentation",
    "footer.rights": "Open data under an open licence.",
    "footer.status": "System operational",

    "home.badge": "Official open data platform",
    "home.titleStart": "Data from",
    "home.titleEnd": "accessible to everyone",
    "home.description":
      "FasoData centralizes and shares public data about Burkina Faso. Agriculture, health, education, economy - explore, analyze and share reliable data for informed development.",
    "home.exploreCta": "Explore data",
    "home.mapCta": "Interactive map",
    "home.stats.datasets": "Datasets",
    "home.stats.categories": "Thematic categories",
    "home.stats.partners": "Partner organizations",
    "home.stats.downloads": "Monthly downloads",
    "home.categoriesTitle": "Explore by theme",
    "home.categoriesSubtitle": "Data organized by sector to make your search easier",
    "home.allCategories": "View all categories",
    "home.datasetsLabel": "datasets",
    "home.featuresTitle": "Everything you need",
    "home.featuresSubtitle": "A complete platform to access, analyze and share public data from Burkina Faso",
    "home.ctaTitle": "Do you have data to share?",
    "home.ctaText": "Join the organizations contributing to Burkina Faso's open data ecosystem.",
    "home.ctaAccount": "Create an institutional account",
    "home.ctaContact": "Contact us",

    "home.feature.search.title": "Advanced search",
    "home.feature.search.description":
      "Find exactly what you need with our full-text search engine and thematic filters.",
    "home.feature.map.title": "Map visualization",
    "home.feature.map.description":
      "Explore Burkina Faso geospatial data on an interactive map powered by OpenStreetMap.",
    "home.feature.charts.title": "Analytics and charts",
    "home.feature.charts.description":
      "Visualize data online with interactive tables, line charts and histograms.",
    "home.feature.export.title": "Multi-format export",
    "home.feature.export.description":
      "Download data as CSV, XLSX or JSON. You can also access it through our documented REST API.",
    "home.feature.verified.title": "Verified data",
    "home.feature.verified.description":
      "Each dataset is validated by our team before publication to ensure quality and reliability.",
    "home.feature.open.title": "Open Data",
    "home.feature.open.description":
      "All public data is freely accessible under open licences, with no registration required.",
  },
};

type LanguageContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  t: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function readInitialLocale(): Locale {
  if (typeof window === "undefined") return "fr";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "en" ? "en" : "fr";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("fr");

  useEffect(() => {
    setLocaleState(readInitialLocale());
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
    window.localStorage.setItem(STORAGE_KEY, locale);
  }, [locale]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      locale,
      setLocale: setLocaleState,
      toggleLocale: () => setLocaleState((current) => (current === "fr" ? "en" : "fr")),
      t: (key) => {
        const value = dictionaries[locale][key] ?? dictionaries.fr[key] ?? key;
        return Array.isArray(value) ? value.join(", ") : value;
      },
    }),
    [locale]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }
  return context;
}
