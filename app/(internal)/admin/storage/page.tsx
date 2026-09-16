import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getFileSettings, getStorageSettingsView } from "@/lib/settings";
import { StorageForm } from "../storage-form";
import { UploadsForm } from "../uploads-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin — Storage" };

export default async function AdminStoragePage() {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const storageSettings = await getStorageSettingsView();
  const files = await getFileSettings();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Storage</h1>
        <p className="text-muted-foreground text-sm">
          Where evidence files live, and what vendors can upload.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>File storage</CardTitle>
          <CardDescription>
            Configure where evidence files and attachments are stored. Changing
            providers does not migrate existing files.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StorageForm defaults={storageSettings} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upload constraints</CardTitle>
          <CardDescription>
            Size and file-type limits applied to vendor evidence uploads.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UploadsForm
            maxUploadMb={files.maxUploadMb}
            allowedExtensions={files.allowedExtensions}
          />
        </CardContent>
      </Card>
    </div>
  );
}
