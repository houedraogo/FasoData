import { expect, test } from "@playwright/test";
import { loginByApi, requiredCredentialsAvailable } from "./helpers/auth";

const institutionEmail = process.env.E2E_INSTITUTION_EMAIL;
const institutionPassword = process.env.E2E_INSTITUTION_PASSWORD;
const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;

const PUBLIC_PATHS = ["/", "/datasets", "/carte", "/developers"];
const DASHBOARD_DENSE_PATHS = ["/dashboard/prix", "/dashboard/validation", "/dashboard/analyse", "/dashboard/profil"];
const ADMIN_DENSE_PATHS = ["/admin/utilisateurs", "/admin/prix", "/admin/supervision", "/admin/demandes-acces"];

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const overflow = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.width + 2);
}

test.describe("smoke responsive", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const path of PUBLIC_PATHS) {
    test(`${path} sans overflow mobile`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator("body")).toBeVisible();
      await expectNoHorizontalOverflow(page);
    });
  }

  test("dashboard mobile sans overflow", async ({ page, context, request }) => {
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
    await expect(page.locator("body")).toContainText("FasoData");
    await expectNoHorizontalOverflow(page);
  });

  for (const path of DASHBOARD_DENSE_PATHS) {
    test(`${path} mobile sans overflow`, async ({ page, context, request }) => {
      test.skip(
        !requiredCredentialsAvailable(institutionEmail, institutionPassword),
        "Definir E2E_INSTITUTION_EMAIL et E2E_INSTITUTION_PASSWORD pour ce smoke test.",
      );

      await loginByApi(request, context, page, {
        email: institutionEmail,
        password: institutionPassword,
        role: "institutional",
      });
      await page.goto(path);
      await expect(page.locator("body")).toContainText("FasoData");
      await expectNoHorizontalOverflow(page);
    });
  }

  test("admin datasets mobile sans overflow", async ({ page, context, request }) => {
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
    await expect(page.locator("body")).toContainText("Datasets");
    await expectNoHorizontalOverflow(page);
  });

  for (const path of ADMIN_DENSE_PATHS) {
    test(`${path} mobile sans overflow`, async ({ page, context, request }) => {
      test.skip(
        !requiredCredentialsAvailable(adminEmail, adminPassword),
        "Definir E2E_ADMIN_EMAIL et E2E_ADMIN_PASSWORD pour ce smoke test.",
      );

      await loginByApi(request, context, page, {
        email: adminEmail,
        password: adminPassword,
        role: "admin",
      });
      await page.goto(path);
      await expect(page.locator("body")).toContainText("FasoData");
      await expectNoHorizontalOverflow(page);
    });
  }
});

test.describe("smoke responsive tablette", () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  for (const path of PUBLIC_PATHS) {
    test(`${path} sans overflow tablette`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator("body")).toBeVisible();
      await expectNoHorizontalOverflow(page);
    });
  }

  for (const path of ["/dashboard", ...DASHBOARD_DENSE_PATHS]) {
    test(`${path} tablette sans overflow`, async ({ page, context, request }) => {
      test.skip(
        !requiredCredentialsAvailable(institutionEmail, institutionPassword),
        "Definir E2E_INSTITUTION_EMAIL et E2E_INSTITUTION_PASSWORD pour ce smoke test.",
      );

      await loginByApi(request, context, page, {
        email: institutionEmail,
        password: institutionPassword,
        role: "institutional",
      });
      await page.goto(path);
      await expect(page.locator("body")).toContainText("FasoData");
      await expectNoHorizontalOverflow(page);
    });
  }

  for (const path of ["/admin/datasets", ...ADMIN_DENSE_PATHS]) {
    test(`${path} tablette sans overflow`, async ({ page, context, request }) => {
      test.skip(
        !requiredCredentialsAvailable(adminEmail, adminPassword),
        "Definir E2E_ADMIN_EMAIL et E2E_ADMIN_PASSWORD pour ce smoke test.",
      );

      await loginByApi(request, context, page, {
        email: adminEmail,
        password: adminPassword,
        role: "admin",
      });
      await page.goto(path);
      await expect(page.locator("body")).toContainText("FasoData");
      await expectNoHorizontalOverflow(page);
    });
  }
});
