import type { APIRequestContext, BrowserContext, Page } from "@playwright/test";

type Role = "admin" | "institutional" | "public";

type LoginOptions = {
  email?: string;
  password?: string;
  role?: Role;
};

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const SESSION_COOKIE = "fasodata_session";
const ROLE_COOKIE = "fasodata_role";

export function requiredCredentialsAvailable(email?: string, password?: string) {
  return Boolean(email && password);
}

export async function loginByApi(
  request: APIRequestContext,
  context: BrowserContext,
  page: Page,
  { email, password, role }: LoginOptions,
) {
  if (!email || !password) throw new Error("Missing E2E credentials");

  const login = await request.post("/api/auth/login", {
    form: { username: email, password },
  });
  if (!login.ok()) {
    throw new Error(`Login failed for ${email}: ${login.status()} ${await login.text()}`);
  }

  const tokens = await login.json();
  const me = await request.get("/api/auth/me", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!me.ok()) {
    throw new Error(`Unable to fetch current user for ${email}: ${me.status()} ${await me.text()}`);
  }
  const user = await me.json();
  const effectiveRole = role ?? user.role;
  const baseURL = new URL(process.env.PLAYWRIGHT_BASE_URL || "http://localhost");

  await context.addCookies([
    {
      name: SESSION_COOKIE,
      value: "1",
      domain: baseURL.hostname,
      path: "/",
      sameSite: "Lax",
      expires: Math.floor(Date.now() / 1000) + 60 * 60,
    },
    {
      name: ROLE_COOKIE,
      value: effectiveRole,
      domain: baseURL.hostname,
      path: "/",
      sameSite: "Lax",
      expires: Math.floor(Date.now() / 1000) + 60 * 60,
    },
  ]);

  await page.addInitScript(
    ({ accessTokenKey, refreshTokenKey, accessToken, refreshToken }) => {
      window.localStorage.setItem(accessTokenKey, accessToken);
      window.localStorage.setItem(refreshTokenKey, refreshToken);
    },
    {
      accessTokenKey: ACCESS_TOKEN_KEY,
      refreshTokenKey: REFRESH_TOKEN_KEY,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
    },
  );

  return { user, tokens };
}
