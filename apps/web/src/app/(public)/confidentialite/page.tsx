import Link from "next/link";
import { Database } from "lucide-react";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-bold text-gray-900 mb-4">{title}</h2>
      <div className="text-gray-600 leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

export default function ConfidentialitePage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-faso-navy text-lg">
            <div className="w-8 h-8 bg-faso-navy rounded-lg flex items-center justify-center">
              <Database className="w-4 h-4 text-white" />
            </div>
            Faso<span className="font-light">Data</span>
          </Link>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <Link href="/conditions" className="hover:text-faso-navy">Conditions</Link>
            <Link href="/contact" className="hover:text-faso-navy">Contact</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        <div className="mb-12">
          <h1 className="text-3xl font-bold text-faso-navy mb-3">Politique de confidentialité</h1>
          <p className="text-gray-400 text-sm">Dernière mise à jour : 1er janvier 2025 · Conforme RGPD</p>
        </div>

        <Section title="1. Données collectées">
          <p>FasoData collecte les données suivantes lors de la création d'un compte :</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Identité :</strong> nom, prénom, adresse email professionnelle</li>
            <li><strong>Organisation :</strong> nom de l'institution ou de l'ONG</li>
            <li><strong>Usage :</strong> journaux de connexion, datasets consultés et téléchargés</li>
          </ul>
          <p>
            Aucune donnée de paiement n'est collectée. La plateforme est gratuite.
          </p>
        </Section>

        <Section title="2. Finalités du traitement">
          <p>Vos données sont utilisées pour :</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Gérer votre compte et authentifier vos accès</li>
            <li>Vous contacter en cas de problème ou de mise à jour importante</li>
            <li>Améliorer la plateforme par des analyses d'usage anonymisées</li>
            <li>Respecter nos obligations légales</li>
          </ul>
        </Section>

        <Section title="3. Base légale">
          <p>
            Le traitement de vos données repose sur votre consentement (art. 6.1.a RGPD) lors de la création
            du compte, et sur l'exécution d'un contrat (art. 6.1.b) pour la fourniture du service.
          </p>
        </Section>

        <Section title="4. Conservation des données">
          <p>
            Vos données sont conservées pendant toute la durée de vie de votre compte, et supprimées dans
            les 30 jours suivant la clôture de votre compte sur simple demande.
          </p>
        </Section>

        <Section title="5. Partage des données">
          <p>
            FasoData ne vend ni ne loue vos données personnelles à des tiers. Les données peuvent être
            partagées avec des sous-traitants techniques (hébergement, emails) dans le strict respect
            des réglementations en vigueur.
          </p>
        </Section>

        <Section title="6. Vos droits">
          <p>Conformément au RGPD, vous disposez des droits suivants :</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Accès :</strong> obtenir une copie de vos données</li>
            <li><strong>Rectification :</strong> corriger des données inexactes</li>
            <li><strong>Suppression :</strong> demander l'effacement de vos données</li>
            <li><strong>Portabilité :</strong> recevoir vos données dans un format structuré</li>
            <li><strong>Opposition :</strong> vous opposer au traitement de vos données</li>
          </ul>
          <p>
            Pour exercer ces droits, contactez-nous à{" "}
            <a href="mailto:privacy@fasodata.com" className="text-faso-red hover:underline">
              privacy@fasodata.com
            </a>
          </p>
        </Section>

        <Section title="7. Cookies">
          <p>
            FasoData utilise des cookies strictement nécessaires au fonctionnement de la plateforme
            (session, authentification). Aucun cookie publicitaire ou de tracking tiers n'est utilisé.
          </p>
        </Section>

        <Section title="8. Contact DPO">
          <p>
            Pour toute question relative à la protection de vos données, contactez notre Délégué
            à la Protection des Données à{" "}
            <a href="mailto:dpo@fasodata.com" className="text-faso-red hover:underline">
              dpo@fasodata.com
            </a>
          </p>
        </Section>
      </div>

      <footer className="py-6 border-t border-gray-100 text-center text-xs text-gray-400">
        <Link href="/" className="hover:text-faso-navy transition-colors">FasoData</Link>
        {" · "}
        <Link href="/conditions" className="hover:text-faso-navy transition-colors">Conditions d'utilisation</Link>
        {" · "}
        <Link href="/contact" className="hover:text-faso-navy transition-colors">Contact</Link>
      </footer>
    </div>
  );
}
