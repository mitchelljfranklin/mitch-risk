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
import { listStaffAccounts } from "@/lib/db/users";
import { listRoles } from "@/lib/db/roles";
import { UsersManager } from "../users-manager";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const translations = await getTranslations("Admin.users");
  return { title: translations("metaTitle") };
}

export default async function AdminUsersPage() {
  const user = await requirePermission(PERMISSIONS.USERS_MANAGE);
  const translations = await getTranslations("Admin.users");
  const [staffAccounts, roles] = await Promise.all([
    listStaffAccounts(),
    listRoles(),
  ]);
  const roleOptions = roles.map((role) => ({ id: role.id, name: role.name }));

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
          <CardTitle>{translations("cardTitle")}</CardTitle>
          <CardDescription>{translations("cardDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <UsersManager
            users={staffAccounts}
            roles={roleOptions}
            currentUserId={user.id}
          />
        </CardContent>
      </Card>
    </div>
  );
}
