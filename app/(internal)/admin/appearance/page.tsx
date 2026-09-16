import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getAppearanceSettings } from "@/lib/settings";
import { AppearanceForm } from "../appearance-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin — Appearance" };

export default async function AdminAppearancePage() {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const appearance = await getAppearanceSettings();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Appearance</h1>
        <p className="text-muted-foreground text-sm">
          Branding across the app — logo, colours, and layout.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Customise the logo, primary colour (buttons), and secondary colour
            (tags/pills). Leave a field blank to use the default.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AppearanceForm
            primaryHex={appearance.primaryHex}
            secondaryHex={appearance.secondaryHex}
            hasLogo={Boolean(appearance.logoKey)}
            logoKey={appearance.logoKey ?? ""}
            ragGreenHex={appearance.ragGreenHex}
            ragAmberHex={appearance.ragAmberHex}
            ragRedHex={appearance.ragRedHex}
            ragUnscoredHex={appearance.ragUnscoredHex}
            borderRadius={appearance.borderRadius}
            pageWidth={appearance.pageWidth}
          />
        </CardContent>
      </Card>
    </div>
  );
}
