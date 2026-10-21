import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getEmailSettings, getEmailTemplateSettings } from "@/lib/settings";
import { EmailForm, SmtpTestForm } from "../email-form";
import { TemplatesManager } from "../templates-manager";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const translations = await getTranslations("Admin.email");
  return { title: translations("metaTitle") };
}

export default async function AdminEmailPage() {
  const user = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const translations = await getTranslations("Admin.email");
  const [email, templates] = await Promise.all([
    getEmailSettings(),
    getEmailTemplateSettings(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {translations("title")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {translations("subtitle")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{translations("smtpTitle")}</CardTitle>
          <CardDescription>{translations("smtpDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <EmailForm
            smtpHost={email.smtpHost}
            smtpPort={email.smtpPort}
            smtpUser={email.smtpUser}
            fromAddress={email.fromAddress}
            fromName={email.fromName}
            smtpPasswordConfigured={email.smtpPasswordConfigured}
          />
          <div className="mt-6 border-t pt-6">
            <SmtpTestForm currentUserEmail={user.email ?? ""} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{translations("templatesTitle")}</CardTitle>
          <CardDescription>
            {translations("templatesDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TemplatesManager templates={templates} />
        </CardContent>
      </Card>
    </div>
  );
}
