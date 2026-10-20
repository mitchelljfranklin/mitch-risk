import { Breadcrumbs } from "@/components/breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getTranslations } from "next-intl/server";

import { NewTemplateForm } from "./new-template-form";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const translations = await getTranslations("Templates.new");
  return { title: translations("title") };
}

export default async function NewTemplatePage() {
  await requirePermission(PERMISSIONS.TEMPLATES_CREATE);
  const translations = await getTranslations("Templates.new");
  const builderTranslations = await getTranslations("Templates.builder");

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <Breadcrumbs
        segments={[
          {
            label: builderTranslations("breadcrumbs.templates"),
            href: "/templates",
          },
          { label: translations("breadcrumb") },
        ]}
      />
      <h1 className="text-2xl font-semibold tracking-tight">
        {translations("title")}
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>{translations("cardTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <NewTemplateForm />
        </CardContent>
      </Card>
    </div>
  );
}
