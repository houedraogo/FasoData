import { expect, test } from "@playwright/test";
import { loginByApi, requiredCredentialsAvailable } from "./helpers/auth";

const institutionEmail = process.env.E2E_INSTITUTION_EMAIL;
const institutionPassword = process.env.E2E_INSTITUTION_PASSWORD;
const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;

test.describe("authentification et espaces prives", () => {
  test("redirige un utilisateur non connecte vers la connexion", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/auth\/connexion\?next=%2Fdashboard/);
    await expect(page.locator("body")).toContainText("Connexion");
  });

  test("ouvre le dashboard ONG avec une session institutionnelle", async ({ page, context, request }) => {
    test.skip(
      !requiredCredentialsAvailable(institutionEmail, institutionPassword),
      "Definir E2E_INSTITUTION_EMAIL et E2E_INSTITUTION_PASSWORD pour ce smoke test.",
    );

    await loginByApi(request, context, page, {
      email: institutionEmail,
      password: institutionPassword,
      role: "institutional",
    });

    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /FasoData|Bienvenue|Bonjour/ })).toBeVisible();
    await expect(page.locator("body")).toContainText(/Vue d'ensemble|Accueil/);
  });

  test("enregistre les preferences depuis l'onboarding", async ({ page, context, request }) => {
    test.skip(
      !requiredCredentialsAvailable(institutionEmail, institutionPassword),
      "Definir E2E_INSTITUTION_EMAIL et E2E_INSTITUTION_PASSWORD pour ce smoke test.",
    );

    const { tokens } = await loginByApi(request, context, page, {
      email: institutionEmail,
      password: institutionPassword,
      role: "institutional",
    });

    await page.goto("/onboarding");
    await expect(page.getByRole("heading", { name: /Bienvenue/ })).toBeVisible();
    await expect(page.locator("body")).not.toContainText(/Ã|â/);

    await page.getByRole("button", { name: /Prix alimentaires/ }).click();
    await page.getByRole("button", { name: /Cartographie/ }).click();
    await page.getByRole("button", { name: /Acceder a la plateforme/ }).click();

    await expect(page).toHaveURL(/\/dashboard/);

    const preferences = await request.get("/api/dashboard/preferences", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    expect(preferences.ok()).toBeTruthy();
    const data = await preferences.json();
    expect(data.is_configured).toBe(true);
    expect(data.domains).toEqual(expect.arrayContaining(["prices", "territory"]));
    expect(data.data_types).toEqual(expect.arrayContaining(["datasets", "time_series", "alerts", "maps"]));
  });

  test("masque puis reactive le parcours de demarrage", async ({ page, context, request }) => {
    test.skip(
      !requiredCredentialsAvailable(institutionEmail, institutionPassword),
      "Definir E2E_INSTITUTION_EMAIL et E2E_INSTITUTION_PASSWORD pour ce smoke test.",
    );

    const { tokens } = await loginByApi(request, context, page, {
      email: institutionEmail,
      password: institutionPassword,
      role: "institutional",
    });
    const authHeaders = { Authorization: `Bearer ${tokens.access_token}` };

    await request.patch("/api/dashboard/preferences/guide", {
      data: { guide_dismissed: false },
      headers: authHeaders,
    });

    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Parcours de demarrage" })).toBeVisible();

    await page.getByRole("button", { name: "Reprendre plus tard" }).click();
    await expect(page.getByRole("heading", { name: "Parcours de demarrage" })).toHaveCount(0);

    const dismissed = await request.get("/api/dashboard/preferences", { headers: authHeaders });
    expect(dismissed.ok()).toBeTruthy();
    expect((await dismissed.json()).guide_dismissed).toBe(true);

    await page.goto("/dashboard/profil");
    await page.getByRole("button", { name: "Afficher le parcours" }).click();
    await expect(page.getByRole("button", { name: "Afficher le parcours" })).toHaveCount(0);

    const restored = await request.get("/api/dashboard/preferences", { headers: authHeaders });
    expect(restored.ok()).toBeTruthy();
    expect((await restored.json()).guide_dismissed).toBe(false);

    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Parcours de demarrage" })).toBeVisible();
  });

  test("ouvre programmes sans erreurs console", async ({ page, context, request }) => {
    test.skip(
      !requiredCredentialsAvailable(institutionEmail, institutionPassword),
      "Definir E2E_INSTITUTION_EMAIL et E2E_INSTITUTION_PASSWORD pour ce smoke test.",
    );

    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(`PAGEERROR: ${error.message}`));

    await loginByApi(request, context, page, {
      email: institutionEmail,
      password: institutionPassword,
      role: "institutional",
    });

    await page.goto("/dashboard/programmes");
    await expect(page.getByRole("heading", { name: "Suivi des prix alimentaires" })).toBeVisible();
    await page.waitForLoadState("networkidle");

    expect(errors).toEqual([]);
  });

  test("ouvre la moderation datasets admin avec une session admin", async ({ page, context, request }) => {
    test.skip(
      !requiredCredentialsAvailable(adminEmail, adminPassword),
      "Definir E2E_ADMIN_EMAIL et E2E_ADMIN_PASSWORD pour ce smoke test.",
    );

    await loginByApi(request, context, page, {
      email: adminEmail,
      password: adminPassword,
      role: "admin",
    });

    await page.goto("/admin/datasets");
    await expect(page.locator("body")).toContainText("datasets");
    await expect(page.locator("body")).toContainText(/Brouillons|Publies|Archives|Rejetes|Publi/);
  });

  test("ouvre les statistiques de visites admin", async ({ page, context, request }) => {
    test.skip(
      !requiredCredentialsAvailable(adminEmail, adminPassword),
      "Definir E2E_ADMIN_EMAIL et E2E_ADMIN_PASSWORD pour ce smoke test.",
    );

    await loginByApi(request, context, page, {
      email: adminEmail,
      password: adminPassword,
      role: "admin",
    });

    await page.goto("/admin/visites");
    await expect(page.getByRole("heading", { name: "Statistiques des visites" })).toBeVisible();
    await expect(page.locator("body")).toContainText("Visiteurs uniques");
  });
});
