import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getEmailSettings, getEmailTemplateSettings } from "@/lib/settings";
import { EmailForm, SmtpTestForm } from "../email-form";
import { TemplatesManager } from "../templates-manager";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin — Email" };

export default async function AdminEmailPage() {
  const user = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const [email, templates] = await Promise.all([
    getEmailSettings(),
    getEmailTemplateSettings(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Email</h1>
        <p className="text-muted-foreground text-sm">
          SMTP delivery and the templates used for vendor and reviewer emails.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>SMTP</CardTitle>
          <CardDescription>
            Used to send vendor invites and reminders. The password is encrypted
            at rest.
          </CardDescription>
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
          <CardTitle>Email templates</CardTitle>
          <CardDescription>
            Select a template to edit its subject and body. Use {"{{"}tokens
            {"}}"} for dynamic values.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TemplatesManager templates={templates} />
        </CardContent>
      </Card>
    </div>
  );
}
