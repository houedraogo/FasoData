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

export default function ConditionsPage() {
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
            <Link href="/confidentialite" className="hover:text-faso-navy">Confidentialité</Link>
            <Link href="/contact" className="hover:text-faso-navy">Contact</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        <div className="mb-12">
          <h1 className="text-3xl font-bold text-faso-navy mb-3">Conditions d'utilisation</h1>
          <p className="text-gray-400 text-sm">Dernière mise à jour : 1er janvier 2025</p>
        </div>

        <Section title="1. Objet">
          <p>
            Les présentes conditions d'utilisation régissent l'accès et l'utilisation de la plateforme FasoData,
            service de données ouvertes dédié au Burkina Faso.
          </p>
          <p>
            En accédant à la plateforme, vous acceptez sans réserve les présentes conditions.
          </p>
        </Section>

        <Section title="2. Accès à la plateforme">
          <p>
            L'accès au catalogue public est gratuit et ne nécessite pas de compte. La consultation,
            le téléchargement et la réutilisation des données ouvertes sont libres dans le respect
            des licences associées à chaque jeu de données.
          </p>
          <p>
            La création d'un compte institutionnel est réservée aux organisations, administrations
            et ONG opérant au Burkina Faso. L'accès est soumis à vérification.
          </p>
        </Section>

        <Section title="3. Propriété intellectuelle">
          <p>
            Les données publiées sur FasoData sont soumises aux licences indiquées sur chaque jeu de données
            (Open Data, CC-BY, etc.). La plateforme elle-même — son code source, son design et sa marque —
            est la propriété de l'équipe FasoData.
          </p>
        </Section>

        <Section title="4. Responsabilités">
          <p>
            FasoData met tout en œuvre pour assurer l'exactitude et la fiabilité des données diffusées,
            mais ne saurait être tenu responsable des erreurs, omissions ou interruptions de service.
          </p>
          <p>
            Les producteurs de données sont responsables de l'exactitude et de la légalité des données
            qu'ils publient sur la plateforme.
          </p>
        </Section>

        <Section title="5. Utilisation interdite">
          <p>Il est interdit d'utiliser la plateforme pour :</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Diffuser des données inexactes, frauduleuses ou portant atteinte aux droits de tiers</li>
            <li>Effectuer des attaques informatiques ou tenter de compromettre la sécurité du système</li>
            <li>Revendre ou commercialiser des données sans autorisation expresse</li>
            <li>Toute activité illégale au regard du droit burkinabè</li>
          </ul>
        </Section>

        <Section title="6. Modification des conditions">
          <p>
            FasoData se réserve le droit de modifier les présentes conditions à tout moment.
            Les utilisateurs seront informés de toute modification substantielle.
          </p>
        </Section>

        <Section title="7. Contact">
          <p>
            Pour toute question relative aux présentes conditions, contactez-nous à{" "}
            <a href="mailto:legal@fasodata.bf" className="text-faso-red hover:underline">
              legal@fasodata.bf
            </a>
          </p>
        </Section>
      </div>

      <footer className="py-6 border-t border-gray-100 text-center text-xs text-gray-400">
        <Link href="/" className="hover:text-faso-navy transition-colors">FasoData</Link>
        {" · "}
        <Link href="/confidentialite" className="hover:text-faso-navy transition-colors">Politique de confidentialité</Link>
        {" · "}
        <Link href="/contact" className="hover:text-faso-navy transition-colors">Contact</Link>
      </footer>
    </div>
  );
}
