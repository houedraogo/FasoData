"use client";

import { create } from "zustand";
import { api } from "@/lib/api";
import { clearAuthTokens, getAccessToken, getRefreshToken, setAuthTokens } from "@/lib/auth-storage";

interface User {
  id: string;
  email: string;
  full_name: string | null;
  organization: string | null;
  role: "admin" | "institutional" | "public";
  is_active: boolean;
}

interface AuthStore {
  user: User | null;
  isLoading: boolean;
  status: "idle" | "checking" | "authenticated" | "anonymous";
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
}

export const useAuth = create<AuthStore>((set) => ({
  user: null,
  isLoading: false,
  status: "idle",

  initialize: async () => {
    if (!getAccessToken()) {
      clearAuthTokens();
      set({ user: null, status: "anonymous", isLoading: false });
      return;
    }

    set({ status: "checking", isLoading: true });
    try {
      const { data } = await api.get("/auth/me");
      setAuthTokens(getAccessToken() ?? "", getRefreshToken() ?? "", data.role);
      set({ user: data, status: "authenticated", isLoading: false });
    } catch {
      clearAuthTokens();
      set({ user: null, status: "anonymous", isLoading: false });
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true, status: "checking" });
    const form = new URLSearchParams();
    form.append("username", email);
    form.append("password", password);

    const { data } = await api.post("/auth/login", form, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    setAuthTokens(data.access_token, data.refresh_token);

    const me = await api.get("/auth/me");
    setAuthTokens(data.access_token, data.refresh_token, me.data.role);
    set({ user: me.data, isLoading: false, status: "authenticated" });
  },

  logout: () => {
    clearAuthTokens();
    set({ user: null, status: "anonymous", isLoading: false });
    window.location.assign("/");
  },

  fetchMe: async () => {
    set({ status: "checking" });
    try {
      const { data } = await api.get("/auth/me");
      setAuthTokens(getAccessToken() ?? "", getRefreshToken() ?? "", data.role);
      set({ user: data, status: "authenticated", isLoading: false });
    } catch {
      clearAuthTokens();
      set({ user: null, status: "anonymous", isLoading: false });
    }
  },
}));
