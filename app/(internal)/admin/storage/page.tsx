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
import { getFileSettings, getStorageSettingsView } from "@/lib/settings";
import { StorageForm } from "../storage-form";
import { UploadsForm } from "../uploads-form";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const translations = await getTranslations("Admin.storage");
  return { title: translations("metaTitle") };
}

export default async function AdminStoragePage() {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const translations = await getTranslations("Admin.storage");
  const storageSettings = await getStorageSettingsView();
  const files = await getFileSettings();

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
          <CardTitle>{translations("fileStorageTitle")}</CardTitle>
          <CardDescription>
            {translations("fileStorageDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StorageForm defaults={storageSettings} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{translations("uploadConstraintsTitle")}</CardTitle>
          <CardDescription>
            {translations("uploadConstraintsDescription")}
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
