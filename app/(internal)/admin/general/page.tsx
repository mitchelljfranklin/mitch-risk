import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getOrganizationSettings } from "@/lib/settings";
import { OrganizationForm } from "../organization-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin — General" };

export default async function AdminGeneralPage() {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const organization = await getOrganizationSettings();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">General</h1>
        <p className="text-muted-foreground text-sm">
          Organization identity shown across the app.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
          <CardDescription>
            The name and support email shown in emails and the interface.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrganizationForm
            name={organization.name}
            supportEmail={organization.supportEmail}
          />
        </CardContent>
      </Card>
    </div>
  );
}
