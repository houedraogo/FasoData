import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "/api",
  headers: { "Content-Type": "application/json" },
});

// ── Injecte le token JWT à chaque requête ─────────────────────────────────────
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
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

      const refreshToken = typeof window !== "undefined"
        ? localStorage.getItem("refresh_token")
        : null;

      if (refreshToken) {
        try {
          const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api";
          const { data } = await axios.post(
            `${apiBase}/auth/refresh`,
            { refresh_token: refreshToken },
            { headers: { "Content-Type": "application/json" } }
          );
          localStorage.setItem("access_token", data.access_token);
          localStorage.setItem("refresh_token", data.refresh_token);
          original.headers.Authorization = `Bearer ${data.access_token}`;
          return api.request(original);
        } catch {
          // Refresh échoué → supprimer les tokens périmés, ne PAS rediriger ici
          // (laisser le composant appelant gérer l'erreur proprement)
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
        }
      }
    }

    return Promise.reject(error);
  }
);
