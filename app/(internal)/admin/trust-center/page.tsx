import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getTrustCenterSettings } from "@/lib/settings";
import { TrustCenterSettingsForm } from "../trust-center-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin — Trust Center" };

export default async function AdminTrustCenterPage() {
  await requirePermission(PERMISSIONS.TRUSTCENTER_MANAGE);
  const trustCenter = await getTrustCenterSettings();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Trust Center</h1>
        <p className="text-muted-foreground text-sm">
          Public-facing compliance page configuration.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Trust Center</CardTitle>
          <CardDescription>
            Public page at <code>/trust</code> sharing compliance badges,
            security documents, subprocessors and narrative sections with
            vendors and partners. Curate the content under Manage → Trust
            center.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TrustCenterSettingsForm
            enabled={trustCenter.enabled}
            intro={trustCenter.intro}
            contactEmail={trustCenter.contactEmail}
            includeInInvites={trustCenter.includeInInvites}
            pageLoadsPerMin={trustCenter.pageLoadsPerMin}
            downloadsPerMin={trustCenter.downloadsPerMin}
          />
        </CardContent>
      </Card>
    </div>
  );
}
