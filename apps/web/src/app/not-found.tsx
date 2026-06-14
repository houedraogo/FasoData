"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Database, Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header minimal */}
      <div className="px-6 py-5 border-b border-gray-100">
        <Link href="/" className="inline-flex items-center gap-2">
          <Image src="/picto.png" alt="FasoData" width={32} height={32} className="w-8 h-8 rounded-lg" />
          <span className="font-bold text-[#1A2C42] text-lg">FasoData</span>
        </Link>
      </div>

      {/* Contenu */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        {/* Code 404 stylisé */}
        <div className="relative mb-8">
          <span
            className="text-[160px] font-black leading-none select-none"
            style={{
              color: "transparent",
              WebkitTextStroke: "2px #E8ECF0",
            }}
          >
            404
          </span>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 bg-[#1A2C42] rounded-2xl flex items-center justify-center shadow-lg">
              <Database className="w-10 h-10 text-white" />
            </div>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-[#1A2C42] mb-3">
          Page introuvable
        </h1>
        <p className="text-gray-500 max-w-md mb-10 leading-relaxed">
          La page que vous cherchez n'existe pas ou a été déplacée.
          Essayez de revenir à l'accueil ou d'explorer nos datasets.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#1A2C42] text-white font-semibold rounded-xl hover:bg-[#0f1e30] transition-colors"
          >
            <Home className="w-4 h-4" />
            Accueil
          </Link>
          <Link
            href="/datasets"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#E04E2F] text-white font-semibold rounded-xl hover:bg-[#c73e22] transition-colors"
          >
            <Database className="w-4 h-4" />
            Explorer les données
          </Link>
          <Link
            href="/recherche"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
          >
            <Search className="w-4 h-4" />
            Rechercher
          </Link>
        </div>

        {/* Lien retour */}
        <button
          onClick={() => history.back()}
          className="mt-8 inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour à la page précédente
        </button>
      </div>

      {/* Barre de couleur en bas */}
      <div className="h-1 w-full bg-gradient-to-r from-[#1A2C42] via-[#E04E2F] to-[#F5A623]" />
    </div>
  );
}
