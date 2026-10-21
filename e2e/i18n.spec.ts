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

  test("translates the template import flow", async ({ page }) => {
    const templateJson = JSON.stringify({
      name: "Plantilla E2E",
      description: "Prueba de importación",
      sections: [
        {
          title: "Acceso",
          questions: [
            {
              text: "¿Se exige MFA?",
              type: "YES_NO",
              riskWeight: "HIGH",
              required: true,
            },
            {
              text: "¿Existe una política?",
              type: "FREE_TEXT",
              riskWeight: "LOW",
              required: false,
            },
          ],
        },
      ],
    });

    await signInAsAdmin(page);

    await page.getByRole("button", { name: "E2E Admin" }).click();
    await page.getByRole("menuitem", { name: "Language" }).hover();
    await page.getByRole("menuitem", { name: "Español" }).click();
    await expect(
      page.getByRole("link", { name: "Proveedores" }).first(),
    ).toBeVisible();

    await page.goto("/templates/import");

    await expect(
      page.getByRole("heading", { name: "Importar plantilla" }),
    ).toBeVisible();
    await expect(
      page.getByText("Sube un archivo JSON para crear una nueva plantilla."),
    ).toBeVisible();
    await expect(page.getByText("Importar plantilla desde JSON")).toBeVisible();
    await expect(page.getByRole("button", { name: "Plantilla" })).toBeVisible();

    await page.setInputFiles('input[type="file"]', {
      name: "template.json",
      mimeType: "application/json",
      buffer: Buffer.from(templateJson),
    });

    await expect(page.getByText("1 sección")).toBeVisible();
    await expect(page.getByText("2 preguntas")).toBeVisible();
    await expect(page.getByText("Sección", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Siguiente →" }).click();

    await expect(page.getByText(/Vas a importar la plantilla/)).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Importar plantilla" }),
    ).toBeVisible();
  });

  test("translates the frameworks list, gaps and import pages", async ({
    page,
  }) => {
    await signInAsAdmin(page);

    await page.getByRole("button", { name: "E2E Admin" }).click();
    await page.getByRole("menuitem", { name: "Language" }).hover();
    await page.getByRole("menuitem", { name: "Español" }).click();
    await expect(
      page.getByRole("link", { name: "Proveedores" }).first(),
    ).toBeVisible();

    await page.goto("/frameworks");

    await expect(page.getByRole("heading", { name: "Marcos" })).toBeVisible();
    await expect(
      page.getByText(
        "Bibliotecas de controles usadas para asignar las respuestas del cuestionario a requisitos.",
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Importar marco" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Brechas de cobertura" }),
    ).toBeVisible();

    await page.goto("/frameworks/gaps");

    await expect(
      page.getByRole("heading", { name: "Brechas de cobertura de controles" }),
    ).toBeVisible();
    await expect(
      page.getByText(/Controles que no tienen preguntas asignadas/),
    ).toBeVisible();

    await page.goto("/frameworks/import");

    await expect(
      page.getByRole("heading", { name: "Importar marco" }),
    ).toBeVisible();
    await expect(page.getByLabel("Nombre del marco")).toBeVisible();
    await expect(page.getByLabel("Versión")).toBeVisible();
    await expect(page.getByLabel("Archivo CSV")).toBeVisible();
    await expect(page.getByRole("button", { name: "Plantilla" })).toBeVisible();
  });

  test("translates the framework detail page", async ({ page }) => {
    const framework = await prisma.framework.findFirst({
      orderBy: { name: "asc" },
    });
    if (!framework) {
      throw new Error("The test database has no frameworks.");
    }

    await signInAsAdmin(page);

    await page.getByRole("button", { name: "E2E Admin" }).click();
    await page.getByRole("menuitem", { name: "Language" }).hover();
    await page.getByRole("menuitem", { name: "Español" }).click();
    await expect(
      page.getByRole("link", { name: "Proveedores" }).first(),
    ).toBeVisible();

    await page.goto(`/frameworks/${framework.id}`);

    await expect(page.locator("h1")).toContainText(framework.name);
    await expect(
      page.getByRole("link", { name: "Marcos" }).first(),
    ).toBeVisible();
    await expect(page.getByPlaceholder("Buscar controles…")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Eliminar marco" }),
    ).toBeVisible();
    await expect(page.getByText("Compartido").first()).toBeVisible();
  });

  test("translates the risk register", async ({ page }) => {
    await signInAsAdmin(page);

    await page.getByRole("button", { name: "E2E Admin" }).click();
    await page.getByRole("menuitem", { name: "Language" }).hover();
    await page.getByRole("menuitem", { name: "Español" }).click();
    await expect(
      page.getByRole("link", { name: "Proveedores" }).first(),
    ).toBeVisible();

    await page.goto("/risk-register");

    await expect(
      page.getByRole("heading", { name: "Registro de riesgos" }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Todos los hallazgos de tus proveedores en un solo lugar.",
      ),
    ).toBeVisible();
    await expect(page.getByText("Hallazgos abiertos")).toBeVisible();
    await expect(page.getByText("Críticos abiertos")).toBeVisible();
    await expect(page.getByText("Remediados")).toBeVisible();
    await expect(page.getByText("Riesgo aceptado").first()).toBeVisible();
    await expect(
      page.getByRole("combobox", {
        name: "Filtrar hallazgos por estado",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("combobox", {
        name: "Filtrar hallazgos por gravedad",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("combobox", {
        name: "Filtrar hallazgos por proveedor",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("combobox", { name: "Ordenar hallazgos" }),
    ).toBeVisible();
    await expect(
      page.getByRole("combobox", { name: "Filtrar por responsabilidad" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Filtrar", exact: true }),
    ).toBeVisible();
  });

  test("translates self-assessment", async ({ page }) => {
    await signInAsAdmin(page);

    await page.getByRole("button", { name: "E2E Admin" }).click();
    await page.getByRole("menuitem", { name: "Language" }).hover();
    await page.getByRole("menuitem", { name: "Español" }).click();
    await expect(
      page.getByRole("link", { name: "Proveedores" }).first(),
    ).toBeVisible();

    await page.goto("/self-assessment");

    await expect(
      page.getByRole("heading", { name: "Autoevaluación" }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Evalúa tu propia organización frente a marcos de cumplimiento usando el mismo portal de cuestionarios que tus proveedores.",
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Iniciar nueva evaluación" }),
    ).toBeVisible();

    await page.goto("/self-assessment/new");

    await expect(
      page.getByRole("heading", { name: "Nueva autoevaluación" }),
    ).toBeVisible();
    await expect(page.getByLabel("Título")).toBeVisible();
    await expect(page.getByText("Plantilla del cuestionario")).toBeVisible();
    await expect(
      page.getByLabel("Fecha de vencimiento (opcional)"),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Iniciar evaluación" }),
    ).toBeVisible();
  });

  test("translates admin general and appearance", async ({ page }) => {
    await signInAsAdmin(page);

    await page.getByRole("button", { name: "E2E Admin" }).click();
    await page.getByRole("menuitem", { name: "Language" }).hover();
    await page.getByRole("menuitem", { name: "Español" }).click();
    await expect(
      page.getByRole("link", { name: "Proveedores" }).first(),
    ).toBeVisible();

    await page.goto("/admin/general");

    await expect(page.getByRole("heading", { name: "General" })).toBeVisible();
    await expect(
      page.getByText("Identidad de la organización mostrada en toda la app."),
    ).toBeVisible();
    await expect(page.getByText("Organización", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Nombre de la organización")).toBeVisible();
    await expect(page.getByLabel("Correo de soporte")).toBeVisible();
    await expect(
      page.getByRole("combobox", { name: "Idioma predeterminado" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Guardar", exact: true }),
    ).toBeVisible();

    await page.goto("/admin/appearance");

    await expect(
      page.getByRole("heading", { name: "Apariencia" }),
    ).toBeVisible();
    await expect(page.getByText("Logotipo", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Color principal", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Color secundario", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Colores de indicadores RAG")).toBeVisible();
    await expect(page.getByLabel("Radio de borde (px)")).toBeVisible();
    await expect(
      page.getByRole("combobox", { name: "Ancho de página" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Guardar apariencia" }),
    ).toBeVisible();
  });

  test("translates admin email, tracking, scoring and scheduling", async ({
    page,
  }) => {
    await signInAsAdmin(page);

    await page.getByRole("button", { name: "E2E Admin" }).click();
    await page.getByRole("menuitem", { name: "Language" }).hover();
    await page.getByRole("menuitem", { name: "Español" }).click();
    await expect(
      page.getByRole("link", { name: "Proveedores" }).first(),
    ).toBeVisible();

    await page.goto("/admin/email");

    await expect(page.getByRole("heading", { name: "Correo" })).toBeVisible();
    await expect(page.getByText("SMTP", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Servidor SMTP")).toBeVisible();
    await expect(page.getByLabel("Puerto SMTP")).toBeVisible();
    await expect(page.getByLabel("Usuario SMTP")).toBeVisible();
    await expect(page.getByLabel("Contraseña SMTP")).toBeVisible();
    await expect(page.getByLabel("Dirección del remitente")).toBeVisible();
    await expect(page.getByLabel("Nombre del remitente")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Enviar prueba" }),
    ).toBeVisible();
    await expect(page.getByText("Plantillas de correo")).toBeVisible();
    await expect(
      page.getByText("Correo de invitación", { exact: true }),
    ).toBeVisible();

    await page.goto("/admin/email-tracking");

    await expect(
      page.getByRole("heading", { name: "Seguimiento de correos" }),
    ).toBeVisible();
    await expect(page.getByText("Retención", { exact: true })).toBeVisible();
    await expect(
      page.getByLabel("Retención del registro de correos (días)"),
    ).toBeVisible();
    await expect(
      page.getByRole("combobox", { name: "Filtrar correos por estado" }),
    ).toBeVisible();
    await expect(
      page.getByRole("combobox", { name: "Filtrar correos por tipo" }),
    ).toBeVisible();

    await page.goto("/admin/scoring");

    await expect(
      page.getByRole("heading", { name: "Puntuación" }),
    ).toBeVisible();
    await expect(page.getByText("Pesos de riesgo (numéricos)")).toBeVisible();
    await expect(page.getByText("Umbrales RAG", { exact: true })).toBeVisible();
    await expect(page.getByText("Verde ≥")).toBeVisible();
    await expect(page.getByText("Ámbar ≥")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Guardar puntuación" }),
    ).toBeVisible();

    await page.goto("/admin/scheduling");

    await expect(
      page.getByRole("heading", { name: "Programación" }),
    ).toBeVisible();
    await expect(
      page.getByText("Días de antelación de los recordatorios"),
    ).toBeVisible();
    await expect(page.getByText("Escalar después de (días)")).toBeVisible();
    await expect(
      page.getByText("Vencimiento predeterminado de la evaluación (días)"),
    ).toBeVisible();
    await expect(
      page.getByText("Ejecutar trabajos programados dentro de la app"),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Guardar programación" }),
    ).toBeVisible();
    await expect(page.getByText(/Última ejecución programada/)).toBeVisible();
  });

  test("translates admin storage, sign-in and rate limits", async ({
    page,
  }) => {
    await signInAsAdmin(page);

    await page.getByRole("button", { name: "E2E Admin" }).click();
    await page.getByRole("menuitem", { name: "Language" }).hover();
    await page.getByRole("menuitem", { name: "Español" }).click();
    await expect(
      page.getByRole("link", { name: "Proveedores" }).first(),
    ).toBeVisible();

    await page.goto("/admin/storage");

    await expect(
      page.getByRole("heading", { name: "Almacenamiento" }),
    ).toBeVisible();
    await expect(
      page.getByRole("combobox", { name: "Proveedor" }),
    ).toBeVisible();
    await expect(page.getByLabel("Bucket")).toBeVisible();
    await expect(page.getByLabel("Región")).toBeVisible();
    await expect(page.getByLabel("ID de clave de acceso")).toBeVisible();
    await expect(page.getByLabel("Clave de acceso secreta")).toBeVisible();
    await expect(page.getByLabel("Nombre del contenedor")).toBeVisible();
    await expect(page.getByLabel("Cadena de conexión")).toBeVisible();
    await expect(
      page.getByLabel("Tamaño máximo de archivo (MB)"),
    ).toBeVisible();
    await expect(
      page.getByText("Extensiones de archivo permitidas"),
    ).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: "Guardar configuración de almacenamiento",
      }),
    ).toBeVisible();

    await page.goto("/admin/sign-in");

    await expect(
      page.getByRole("heading", { name: "Inicio de sesión" }),
    ).toBeVisible();
    await expect(
      page.getByText("Microsoft Entra ID", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Google Workspace", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("OIDC personalizado", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Activado").first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Guardar SSO" }),
    ).toBeVisible();
    await expect(
      page.getByText("Acceso de emergencia", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByLabel("Límite de intentos de inicio de sesión (por minuto)"),
    ).toBeVisible();
    await expect(page.getByLabel("Cierre automático (minutos)")).toBeVisible();

    await page.goto("/admin/rate-limits");

    await expect(
      page.getByRole("heading", { name: "Límites de velocidad" }),
    ).toBeVisible();
    await expect(
      page.getByLabel("Cargas de página del portal / min (por visitante)"),
    ).toBeVisible();
    await expect(
      page.getByLabel("Subidas de evidencia del portal / min (por visitante)"),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Guardar límites de velocidad" }),
    ).toBeVisible();
  });
});
