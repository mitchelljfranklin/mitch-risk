import { expect, test } from "@playwright/test";

import {
  getOrganizationSettings,
  updateOrganizationSettings,
} from "@/lib/settings";
import { prisma } from "@/lib/prisma";

import { signInAsAdmin } from "./helpers";

test.describe("locale selection", () => {
  test("switches the auth screens and persists the choice", async ({
    page,
  }) => {
    await page.goto("/login");

    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();

    await page.getByRole("combobox", { name: "Change language" }).click();
    await page.getByRole("option", { name: "Español" }).click();

    await expect(
      page.getByRole("button", { name: "Iniciar sesión" }),
    ).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "es");

    await page.reload();
    await expect(
      page.getByRole("button", { name: "Iniciar sesión" }),
    ).toBeVisible();

    await page.getByRole("combobox", { name: "Cambiar idioma" }).click();
    await page.getByRole("option", { name: "English" }).click();

    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });
});

test.describe("organization default language", () => {
  test.beforeEach(async () => {
    const organization = await getOrganizationSettings();
    if (organization.defaultLocale !== "en") {
      await updateOrganizationSettings({
        ...organization,
        defaultLocale: "en",
      });
    }
  });

  test.afterEach(async () => {
    const organization = await getOrganizationSettings();
    if (organization.defaultLocale !== "en") {
      await updateOrganizationSettings({
        ...organization,
        defaultLocale: "en",
      });
    }
  });

  test("applies to visitors without a language cookie", async ({
    page,
    browser,
  }) => {
    await signInAsAdmin(page);
    await page.goto("/admin/general");

    await page.getByRole("combobox", { name: "Default language" }).click();
    await page.getByRole("option", { name: "Español" }).click();
    await page.getByRole("button", { name: "Save" }).first().click();
    await expect(page.getByText("Organization settings saved.")).toBeVisible({
      timeout: 15000,
    });

    const visitor = await browser.newContext({ locale: "en-US" });
    const visitorPage = await visitor.newPage();
    await visitorPage.goto("/login");
    await expect(
      visitorPage.getByRole("button", { name: "Iniciar sesión" }),
    ).toBeVisible();
    await visitor.close();
  });
});

test.describe("internal shell", () => {
  test.beforeEach(async () => {
    const organization = await getOrganizationSettings();
    if (organization.defaultLocale !== "en") {
      await updateOrganizationSettings({
        ...organization,
        defaultLocale: "en",
      });
    }
  });

  test("switches the shell language from the user menu", async ({ page }) => {
    await signInAsAdmin(page);

    const sidebar = page.locator("[data-slot='sidebar-inner']");
    await expect(
      sidebar.getByRole("link", { name: "Vendors" }).first(),
    ).toBeVisible();

    await page.getByRole("button", { name: "E2E Admin" }).click();
    await page.getByRole("menuitem", { name: "Language" }).hover();
    await page.getByRole("menuitem", { name: "Español" }).click();

    await expect(
      sidebar.getByRole("link", { name: "Proveedores" }).first(),
    ).toBeVisible();

    await page.reload();
    await expect(
      sidebar.getByRole("link", { name: "Proveedores" }).first(),
    ).toBeVisible();

    await page.getByRole("button", { name: "E2E Admin" }).click();
    await page.getByRole("menuitem", { name: "Idioma" }).hover();
    await page.getByRole("menuitem", { name: "English" }).click();

    await expect(
      sidebar.getByRole("link", { name: "Vendors" }).first(),
    ).toBeVisible();
  });

  test("generates the portfolio PDF in the selected language", async ({
    page,
  }) => {
    await signInAsAdmin(page);

    await page.getByRole("button", { name: "E2E Admin" }).click();
    await page.getByRole("menuitem", { name: "Language" }).hover();
    await page.getByRole("menuitem", { name: "Español" }).click();
    await expect(
      page.getByRole("link", { name: "Proveedores" }).first(),
    ).toBeVisible();

    const response = await page.request.get("/api/dashboard/report");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/pdf");
  });

  test("translates the dashboard", async ({ page }) => {
    await signInAsAdmin(page);

    await page.getByRole("button", { name: "E2E Admin" }).click();
    await page.getByRole("menuitem", { name: "Language" }).hover();
    await page.getByRole("menuitem", { name: "Español" }).click();

    await expect(
      page.getByRole("heading", { name: "Resumen de riesgo de proveedores" }),
    ).toBeVisible();
    await expect(page.getByText("Actividad de evaluaciones")).toBeVisible();
  });

  test("translates the vendors list", async ({ page }) => {
    await signInAsAdmin(page);

    await page.getByRole("button", { name: "E2E Admin" }).click();
    await page.getByRole("menuitem", { name: "Language" }).hover();
    await page.getByRole("menuitem", { name: "Español" }).click();
    await expect(
      page.getByRole("link", { name: "Proveedores" }).first(),
    ).toBeVisible();
    await page.goto("/vendors");

    await expect(
      page.getByRole("heading", { name: "Proveedores" }),
    ).toBeVisible();
    await expect(
      page.getByText("Proveedores que evalúas para el riesgo de seguridad."),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Nuevo proveedor" }),
    ).toBeVisible();
  });

  test("translates the vendor detail page", async ({ page }) => {
    const vendor = await prisma.vendor.findFirst({ orderBy: { name: "asc" } });
    if (!vendor) {
      throw new Error("The seeded test database has no vendors.");
    }

    await signInAsAdmin(page);

    await page.getByRole("button", { name: "E2E Admin" }).click();
    await page.getByRole("menuitem", { name: "Language" }).hover();
    await page.getByRole("menuitem", { name: "Español" }).click();
    await expect(
      page.getByRole("link", { name: "Proveedores" }).first(),
    ).toBeVisible();

    await page.goto(`/vendors/${vendor.id}`);

    await expect(page.getByRole("tab", { name: "Resumen" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Cumplimiento" })).toBeVisible();
    await expect(page.getByText("Perfil de riesgo")).toBeVisible();
    await expect(
      page.getByText("Certificaciones y acreditaciones"),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Editar" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Exportar CSV" }),
    ).toBeVisible();
  });

  test("translates the assessments list", async ({ page }) => {
    await signInAsAdmin(page);

    await page.getByRole("button", { name: "E2E Admin" }).click();
    await page.getByRole("menuitem", { name: "Language" }).hover();
    await page.getByRole("menuitem", { name: "Español" }).click();
    await expect(
      page.getByRole("link", { name: "Proveedores" }).first(),
    ).toBeVisible();

    await page.goto("/assessments");

    await expect(
      page.getByRole("heading", { name: "Evaluaciones" }),
    ).toBeVisible();
    await expect(
      page.getByText("Evaluaciones enviadas a proveedores."),
    ).toBeVisible();
    await expect(page.getByLabel("Buscar")).toBeVisible();
    await expect(
      page.getByRole("combobox", { name: "Filtrar evaluaciones por estado" }),
    ).toBeVisible();
    await expect(
      page.getByRole("combobox", { name: "Ordenar evaluaciones" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Filtrar", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Solo vencidas")).toBeVisible();
  });

  test("translates the new assessment page", async ({ page }) => {
    const vendor = await prisma.vendor.findFirst({ orderBy: { name: "asc" } });
    if (!vendor) {
      throw new Error("The seeded test database has no vendors.");
    }

    await signInAsAdmin(page);

    await page.getByRole("button", { name: "E2E Admin" }).click();
    await page.getByRole("menuitem", { name: "Language" }).hover();
    await page.getByRole("menuitem", { name: "Español" }).click();
    await expect(
      page.getByRole("link", { name: "Proveedores" }).first(),
    ).toBeVisible();

    await page.goto(`/vendors/${vendor.id}/assessments/new`);

    await expect(
      page.getByRole("heading", {
        name: `Nueva evaluación para ${vendor.name}`,
      }),
    ).toBeVisible();
    await expect(page.getByText("Detalles de la evaluación")).toBeVisible();
    await expect(page.getByText("Plantilla del cuestionario")).toBeVisible();
    await expect(page.getByText("Fecha de vencimiento")).toBeVisible();
    await expect(page.getByText("Revisor")).toBeVisible();
    await expect(page.getByRole("link", { name: "Cancelar" })).toBeVisible();
  });

  test("translates the assessment detail page", async ({ page }) => {
    const assessment = await prisma.assessment.findFirst({
      where: { title: "E2E Assessment" },
    });
    if (!assessment) {
      throw new Error("The e2e assessment fixture was not created.");
    }
    const statusLabels: Record<string, string> = {
      DRAFT: "Borrador",
      SENT: "Enviado",
      IN_PROGRESS: "En curso",
      SUBMITTED: "Enviado a revisión",
      UNDER_REVIEW: "En revisión",
      COMPLETED: "Completado",
    };

    await signInAsAdmin(page);

    await page.getByRole("button", { name: "E2E Admin" }).click();
    await page.getByRole("menuitem", { name: "Language" }).hover();
    await page.getByRole("menuitem", { name: "Español" }).click();
    await expect(
      page.getByRole("link", { name: "Proveedores" }).first(),
    ).toBeVisible();

    await page.goto(`/assessments/${assessment.id}`);

    await expect(page.locator("h1")).toContainText(assessment.title);
    await expect(page.locator("h1")).toContainText(
      statusLabels[assessment.status] ?? assessment.status,
    );
    await expect(
      page.getByRole("link", { name: "Exportar CSV" }),
    ).toBeVisible();
    await expect(page.getByText("Respuestas", { exact: true })).toBeVisible();
  });

  test("translates the templates list and new template page", async ({
    page,
  }) => {
    await signInAsAdmin(page);

    await page.getByRole("button", { name: "E2E Admin" }).click();
    await page.getByRole("menuitem", { name: "Language" }).hover();
    await page.getByRole("menuitem", { name: "Español" }).click();
    await expect(
      page.getByRole("link", { name: "Proveedores" }).first(),
    ).toBeVisible();

    await page.goto("/templates");

    await expect(
      page.getByRole("heading", { name: "Plantillas" }),
    ).toBeVisible();
    await expect(
      page.getByText("Crea y versiona cuestionarios de seguridad."),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Nueva plantilla" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Importar" })).toBeVisible();

    await page.goto("/templates/new");

    await expect(
      page.getByRole("heading", { name: "Nueva plantilla" }),
    ).toBeVisible();
    await expect(page.getByLabel("Nombre")).toBeVisible();
    await expect(page.getByLabel("Descripción")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Crear plantilla" }),
    ).toBeVisible();
  });

  test("translates the template builder and preview", async ({ page }) => {
    const template = await prisma.template.findFirst({
      where: { name: "E2E Template" },
    });
    if (!template) {
      throw new Error("The e2e template fixture was not created.");
    }

    await signInAsAdmin(page);

    await page.getByRole("button", { name: "E2E Admin" }).click();
    await page.getByRole("menuitem", { name: "Language" }).hover();
    await page.getByRole("menuitem", { name: "Español" }).click();
    await expect(
      page.getByRole("link", { name: "Proveedores" }).first(),
    ).toBeVisible();

    await page.goto(`/templates/${template.id}`);

    await expect(page.locator("h1")).toContainText("Publicada");
    await expect(
      page.getByRole("button", { name: "Crear nueva versión" }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Esta versión está publicada y es de solo lectura. Crea una nueva versión para hacer cambios.",
      ),
    ).toBeVisible();
    await expect(page.getByText("Ocultar 3 preguntas")).toBeVisible();
    await expect(page.getByText("Sí / No", { exact: true })).toBeVisible();
    await expect(page.getByText("Obligatoria").first()).toBeVisible();

    await page.goto(`/templates/${template.id}/preview`);

    await expect(page.getByText(/Vista previa de solo lectura/)).toBeVisible();
    await expect(page.getByText("Sí", { exact: true }).first()).toBeVisible();
    await expect(
      page.getByPlaceholder("Respuesta de texto libre"),
    ).toBeVisible();
    await expect(page.getByText("Carga de archivo adjunto")).toBeVisible();
  });
});
