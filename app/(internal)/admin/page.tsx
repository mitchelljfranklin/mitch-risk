import { redirect } from "next/navigation";

import { requireAnyPermission } from "@/lib/auth";
import {
  ADMIN_AREA_PERMISSIONS,
  firstAccessibleAdminHref,
} from "@/lib/admin-nav";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin" };

// Landing route: send the user to the first admin section their role can
// see. Full admins land on General; a users-only admin lands on Users; an
// audit-only custom role lands on the audit log.
export default async function AdminIndexPage() {
  const user = await requireAnyPermission([...ADMIN_AREA_PERMISSIONS]);

  const target = firstAccessibleAdminHref(user.permissions) ?? "/dashboard";
  redirect(target);
}
