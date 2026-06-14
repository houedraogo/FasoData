"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

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
        {/* Icône */}
        <div className="w-20 h-20 bg-[#E04E2F]/10 rounded-2xl flex items-center justify-center mb-8">
          <AlertTriangle className="w-10 h-10 text-[#E04E2F]" />
        </div>

        <h1 className="text-2xl font-bold text-[#1A2C42] mb-3">
          Une erreur est survenue
        </h1>
        <p className="text-gray-500 max-w-md mb-2 leading-relaxed">
          Un problème inattendu s'est produit. Nos équipes en sont informées.
        </p>
        {error.digest && (
          <p className="text-xs text-gray-400 mb-10 font-mono">
            Référence : {error.digest}
          </p>
        )}
        {!error.digest && <div className="mb-10" />}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#E04E2F] text-white font-semibold rounded-xl hover:bg-[#c73e22] transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Réessayer
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
          >
            <Home className="w-4 h-4" />
            Retour à l'accueil
          </Link>
        </div>
      </div>

      {/* Barre de couleur en bas */}
      <div className="h-1 w-full bg-gradient-to-r from-[#1A2C42] via-[#E04E2F] to-[#F5A623]" />
    </div>
  );
}
