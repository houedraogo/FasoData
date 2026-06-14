import { expect, test } from "@playwright/test";

const PUBLIC_ROUTES = [
  { path: "/", text: "FasoData" },
  { path: "/datasets", text: "Explorer les données" },
  { path: "/carte", text: "Carte" },
  { path: "/carte-prix", text: "prix" },
  { path: "/guide", text: "Guide" },
  { path: "/developers", text: "API" },
  { path: "/auth/connexion", text: "Connexion" },
];

test.describe("navigation publique", () => {
  for (const route of PUBLIC_ROUTES) {
    test(`${route.path} se charge sans erreur`, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));

      await page.goto(route.path);
      await expect(page.locator("body")).toContainText(route.text);
      await expect(page.locator("body")).toBeVisible();
      expect(errors).toEqual([]);
    });
  }

  test("la documentation developers lit OpenAPI", async ({ page }) => {
    await page.goto("/developers");
    await expect(page.getByRole("heading", { name: "Référence endpoints" })).toBeVisible();
    await expect(page.locator("tbody tr")).not.toHaveCount(0);
    await expect(page.locator("body")).not.toContainText("OpenAPI indisponible");
  });
});
