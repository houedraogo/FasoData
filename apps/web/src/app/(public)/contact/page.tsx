"use client";

import Link from "next/link";
import { ArrowRight, Database, Mail, MapPin } from "lucide-react";

export default function ContactPage() {
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const firstName = String(formData.get("firstName") ?? "").trim();
    const lastName = String(formData.get("lastName") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const subject = String(formData.get("subject") ?? "Demande FasoData").trim();
    const message = String(formData.get("message") ?? "").trim();

    const body = [
      `Nom: ${firstName} ${lastName}`.trim(),
      `Email: ${email}`,
      "",
      message,
    ].join("\n");

    window.location.href = `mailto:contact@fasodata.bf?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-faso-navy text-lg">
            <div className="w-8 h-8 bg-faso-navy rounded-lg flex items-center justify-center">
              <Database className="w-4 h-4 text-white" />
            </div>
            Faso<span className="font-light">Data</span>
          </Link>
          <Link href="/datasets" className="text-sm text-gray-500 hover:text-faso-navy transition-colors">
            Explorer les données
          </Link>
        </div>
      </nav>

      <section className="bg-faso-navy py-20">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Contactez-nous</h1>
          <p className="text-white/70 text-lg max-w-xl mx-auto">
            Une question, une suggestion ou un partenariat ? Notre équipe vous répond sous 48h.
          </p>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-2 gap-16">
          <div className="space-y-8">
            <h2 className="text-2xl font-bold text-faso-navy">Informations de contact</h2>

            {[
              { icon: Mail, label: "Email général", value: "contact@fasodata.bf", href: "mailto:contact@fasodata.bf" },
              { icon: Mail, label: "Support technique", value: "support@fasodata.bf", href: "mailto:support@fasodata.bf" },
              { icon: Mail, label: "Partenariats", value: "partenariats@fasodata.bf", href: "mailto:partenariats@fasodata.bf" },
              { icon: MapPin, label: "Adresse", value: "Ouagadougou, Burkina Faso", href: null },
            ].map(({ icon: Icon, label, value, href }) => (
              <div key={label} className="flex items-start gap-4">
                <div className="w-10 h-10 bg-faso-navy/10 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="w-5 h-5 text-faso-navy" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
                  {href ? (
                    <a href={href} className="text-faso-navy hover:text-faso-red font-medium transition-colors">
                      {value}
                    </a>
                  ) : (
                    <p className="text-gray-700 font-medium">{value}</p>
                  )}
                </div>
              </div>
            ))}

            <div className="pt-6 border-t border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-3">Vous êtes une institution ?</h3>
              <p className="text-gray-500 text-sm mb-4 leading-relaxed">
                Rejoignez la plateforme et partagez vos données avec des milliers d'utilisateurs au Burkina Faso.
              </p>
              <Link href="/auth/inscription" className="inline-flex items-center gap-2 px-5 py-2.5 bg-faso-red text-white rounded-xl text-sm font-semibold hover:bg-faso-red/90 transition-colors">
                Créer un compte institutionnel
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="bg-gray-50 rounded-2xl p-8 space-y-4">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Envoyer un message</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Prénom</label>
                <input name="firstName" type="text" required placeholder="Aïcha" className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-faso-navy/20" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Nom</label>
                <input name="lastName" type="text" required placeholder="Sawadogo" className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-faso-navy/20" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Email</label>
              <input name="email" type="email" required placeholder="vous@example.com" className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-faso-navy/20" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Sujet</label>
              <select name="subject" className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-faso-navy/20">
                <option>Demande d'information</option>
                <option>Signalement d'un problème</option>
                <option>Partenariat / Collaboration</option>
                <option>Accès institutionnel</option>
                <option>Autre</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Message</label>
              <textarea name="message" required rows={5} placeholder="Décrivez votre demande..."
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-faso-navy/20 resize-none" />
            </div>
            <button type="submit" className="w-full py-3 bg-faso-navy hover:bg-faso-navy/90 text-white font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
              <Mail className="w-4 h-4" />
              Préparer l'email
            </button>
            <p className="text-xs text-gray-400 text-center">
              L'envoi final se fait depuis votre client email.
            </p>
          </form>
        </div>
      </section>

      <footer className="py-6 border-t border-gray-100 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} FasoData ·{" "}
        <Link href="/" className="hover:text-faso-navy transition-colors">Accueil</Link>
        {" · "}
        <Link href="/a-propos" className="hover:text-faso-navy transition-colors">À propos</Link>
      </footer>
    </div>
  );
}
