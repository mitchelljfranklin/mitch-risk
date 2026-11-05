import { requirePermission } from "@/lib/auth";
import { getTranslations } from "next-intl/server";
import { PERMISSIONS } from "@/lib/permissions";
import { getUserAuthInfo } from "@/lib/db/users";

import { ProfileForm } from "./profile-form";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const translations = await getTranslations("Profile");
  return { title: translations("metaTitle") };
}

export default async function ProfilePage() {
  const user = await requirePermission(PERMISSIONS.PROFILE_VIEW);
  const translations = await getTranslations("Profile");
  const authInfo = await getUserAuthInfo(user.id);
  const hasLocalPassword = authInfo?.hasLocalPassword ?? true;
  const isSsoUser = authInfo?.isSsoUser ?? false;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {translations("title")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {translations("subtitle")}
        </p>
      </div>

      <ProfileForm
        name={user.name ?? ""}
        email={user.email ?? ""}
        hasLocalPassword={hasLocalPassword}
        isSsoUser={isSsoUser}
      />
    </div>
  );
}
