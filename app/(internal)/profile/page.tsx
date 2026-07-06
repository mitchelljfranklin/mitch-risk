import { requireUser } from "@/lib/auth";
import { getUserAuthInfo } from "@/lib/db/users";

import { ProfileForm } from "./profile-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireUser();
  const authInfo = await getUserAuthInfo(user.id);
  const hasLocalPassword = authInfo?.hasLocalPassword ?? true;
  const isSsoUser = authInfo?.isSsoUser ?? false;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-muted-foreground text-sm">
          Manage your account details.
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
