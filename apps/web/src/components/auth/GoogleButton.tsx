"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { setAuthTokens } from "@/lib/auth-storage";
import toast from "react-hot-toast";
import axios from "axios";

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: object) => void;
          prompt: () => void;
          renderButton: (el: HTMLElement, cfg: object) => void;
          disableAutoSelect: () => void;
          revoke: (email: string, callback: () => void) => void;
        };
      };
    };
  }
}

export function GoogleButton({ onSuccess }: { onSuccess?: () => void }) {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { fetchMe }  = useAuth();
  const btnRef       = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [ready,   setReady]   = useState(false);

  const handleCredential = async (credential: string) => {
    setLoading(true);
    try {
      const { data } = await api.post("/auth/google", { credential });
      setAuthTokens(data.access_token, data.refresh_token);
      await fetchMe();
      const role = useAuth.getState().user?.role;

      toast.success("Connecté avec Google !");
      if (onSuccess) {
        onSuccess();
        return;
      }
      if (data.is_new) {
        router.replace("/onboarding");
        return;
      }
      const next = searchParams.get("next");
      if (role === "admin") {
        router.replace(next?.startsWith("/admin") ? next : "/admin");
      } else if (role === "institutional") {
        router.replace(next?.startsWith("/dashboard") ? next : "/dashboard");
      } else {
        router.replace(next && !next.startsWith("/admin") && !next.startsWith("/dashboard") ? next : "/datasets");
      }
    } catch (error) {
      const detail = axios.isAxiosError(error) ? error.response?.data?.detail : undefined;
      toast.error(typeof detail === "string" ? detail : "Connexion Google échouée. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!CLIENT_ID) return;

    const init = () => {
      if (!window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: (resp: { credential: string }) => handleCredential(resp.credential),
        auto_select: false,
        cancel_on_tap_outside: true,
      });
      if (btnRef.current) {
        window.google.accounts.id.renderButton(btnRef.current, {
          type: "standard",
          shape: "rectangular",
          theme: "outline",
          text: "continue_with",
          locale: "fr",
          width: btnRef.current.offsetWidth || 280,
        });
      }
      setReady(true);
    };

    // Si le script est déjà chargé
    if (window.google?.accounts?.id) {
      init();
      return;
    }

    // Charger le script Google Identity Services
    if (!document.getElementById("gsi-script")) {
      const script = document.createElement("script");
      script.id  = "gsi-script";
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = init;
      document.head.appendChild(script);
    } else {
      // Script en cours de chargement — attendre
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval);
          init();
        }
      }, 100);
      return () => clearInterval(interval);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!CLIENT_ID) {
    return (
      <div className="w-full rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-center">
        <p className="text-sm font-semibold text-gray-700">Connexion Google indisponible</p>
        <p className="mt-1 text-xs text-gray-400">
          Configurez NEXT_PUBLIC_GOOGLE_CLIENT_ID pour activer le bouton Google.
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-xl z-10">
          <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
        </div>
      )}
      {/* Le bouton Google est rendu ici par le SDK GSI */}
      <div ref={btnRef} className={ready ? "" : "hidden"} style={{ width: "100%" }} />
      {/* Fallback pendant le chargement du SDK */}
      {!ready && (
        <div className="w-full py-2.5 px-4 border border-gray-200 rounded-xl flex items-center justify-center gap-2 text-sm text-gray-500 bg-white">
          <Loader2 className="w-4 h-4 animate-spin" />
          Chargement…
        </div>
      )}
    </div>
  );
}
