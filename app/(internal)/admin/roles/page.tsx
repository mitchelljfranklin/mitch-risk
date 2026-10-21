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
import { listRoles } from "@/lib/db/roles";
import { FlashToast } from "@/components/flash-toast";
import { RolesManager } from "../roles-manager";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const translations = await getTranslations("Admin.roles");
  return { title: translations("metaTitle") };
}

export default async function AdminRolesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requirePermission(PERMISSIONS.ROLES_MANAGE);
  const translations = await getTranslations("Admin.roles");
  const sp = await searchParams;
  const roles = await listRoles();
  const roleViews = roles.map((role) => ({
    id: role.id,
    name: role.name,
    description: role.description,
    permissions: role.permissions,
    isSystem: role.isSystem,
    userCount: role._count.users,
  }));

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

      {sp.roleError ? (
        <FlashToast variant="error" message={sp.roleError} />
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>{translations("cardTitle")}</CardTitle>
          <CardDescription>{translations("cardDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <RolesManager roles={roleViews} />
        </CardContent>
      </Card>
    </div>
  );
}
