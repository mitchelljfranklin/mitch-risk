import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { listStaffAccounts } from "@/lib/db/users";
import { listRoles } from "@/lib/db/roles";
import { UsersManager } from "../users-manager";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin — Users" };

export default async function AdminUsersPage() {
  const user = await requirePermission(PERMISSIONS.USERS_MANAGE);
  const [staffAccounts, roles] = await Promise.all([
    listStaffAccounts(),
    listRoles(),
  ]);
  const roleOptions = roles.map((role) => ({ id: role.id, name: role.name }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="text-muted-foreground text-sm">
          Staff accounts and their access.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Staff accounts</CardTitle>
          <CardDescription>
            Create staff accounts and manage their role, access, and password.
          </CardDescription>
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
