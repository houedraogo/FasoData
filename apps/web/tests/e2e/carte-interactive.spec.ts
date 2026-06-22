import { expect, test, type Page } from "@playwright/test";

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.width + 2);
}

async function expectCarteReady(page: Page) {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  const startedAt = Date.now();
  await page.goto("/carte", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: /Carte interactive/i })).toBeVisible();
  await expect(page.getByText(/Couches.*filtres/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: /Indicateur affiché|Indicateur affiche/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Calques/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Période|Periode/i })).toBeVisible();
  await expect(page.getByText(/HDX\/WFP/i).nth(1)).toBeVisible();
  await expect(page.getByText(/Région sélectionnée|Region selectionnee/i)).toBeVisible();

  await page.waitForSelector(".leaflet-container svg path", { timeout: 15_000 });
  const regionPaths = await page.locator(".leaflet-container svg path").count();
  expect(regionPaths).toBeGreaterThanOrEqual(10);

  const mapBox = await page.locator(".leaflet-container").boundingBox();
  expect(mapBox?.width ?? 0).toBeGreaterThan(280);
  expect(mapBox?.height ?? 0).toBeGreaterThan(360);

  await expectNoHorizontalOverflow(page);

  const renderMs = Date.now() - startedAt;
  expect(renderMs).toBeLessThan(15_000);
  expect(consoleErrors.filter((message) => !message.includes("favicon")).join("\n")).toBe("");
}

test.describe("carte interactive publique", () => {
  test("mobile: GeoJSON, filtres, source et panneau region restent utilisables", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await expectCarteReady(page);
  });

  test("tablette: GeoJSON, filtres, source et panneau region restent utilisables", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await expectCarteReady(page);
  });
});
