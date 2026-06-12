"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

type AuthRole = "admin" | "institutional" | "public";

function AuthLoadingScreen() {
  return (
    <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center">
      <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white px-5 py-4 text-sm font-medium text-gray-500 shadow-sm">
        <Loader2 className="h-4 w-4 animate-spin text-[#E04E2F]" />
        Vérification de la session...
      </div>
    </div>
  );
}

function fallbackRoute(role?: AuthRole | null) {
  if (role === "admin") return "/admin";
  if (role === "institutional") return "/dashboard";
  return "/datasets";
}

export function AuthGate({
  allowedRoles,
  children,
}: {
  allowedRoles: AuthRole[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, status, initialize } = useAuth();

  useEffect(() => {
    if (status === "idle") void initialize();
  }, [initialize, status]);

  useEffect(() => {
    const onExpired = () => {
      router.replace(`/auth/connexion?next=${encodeURIComponent(pathname)}`);
    };
    window.addEventListener("fasodata:auth-expired", onExpired);
    return () => window.removeEventListener("fasodata:auth-expired", onExpired);
  }, [pathname, router]);

  useEffect(() => {
    if (status === "anonymous") {
      router.replace(`/auth/connexion?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (status === "authenticated" && user && !allowedRoles.includes(user.role)) {
      router.replace(fallbackRoute(user.role));
    }
  }, [allowedRoles, pathname, router, status, user]);

  if (status === "idle" || status === "checking") return <AuthLoadingScreen />;
  if (!user || !allowedRoles.includes(user.role)) return <AuthLoadingScreen />;

  return <>{children}</>;
}
