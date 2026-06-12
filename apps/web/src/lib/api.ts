import axios from "axios";
import { clearAuthTokens, getAccessToken, getRefreshToken, setAuthTokens } from "@/lib/auth-storage";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "/api",
  headers: { "Content-Type": "application/json" },
});

// ── Injecte le token JWT à chaque requête ─────────────────────────────────────
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = getAccessToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Gestion 401 avec flag _retry anti-boucle ──────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    // Ne pas retenter si : déjà retried, ou si c'est login/refresh qui échoue
    if (
      error.response?.status === 401 &&
      !original._retry &&
      !original.url?.includes("/auth/refresh") &&
      !original.url?.includes("/auth/login")
    ) {
      original._retry = true;

      const refreshToken = getRefreshToken();

      if (refreshToken) {
        try {
          const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api";
          const { data } = await axios.post(
            `${apiBase}/auth/refresh`,
            { refresh_token: refreshToken },
            { headers: { "Content-Type": "application/json" } }
          );
          setAuthTokens(data.access_token, data.refresh_token);
          original.headers.Authorization = `Bearer ${data.access_token}`;
          return api.request(original);
        } catch {
          clearAuthTokens();
          window.dispatchEvent(new Event("fasodata:auth-expired"));
        }
      }
    }

    return Promise.reject(error);
  }
);
