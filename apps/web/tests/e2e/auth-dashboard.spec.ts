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
});
