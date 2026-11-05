import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { countUsers, findValidResetToken } from "@/lib/db/users";

import { ResetPasswordForm } from "./reset-password-form";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const translations = await getTranslations("Auth.reset");
  return { title: translations("title") };
}

type ResetPageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPageProps) {
  if ((await countUsers()) === 0) {
    redirect("/setup");
  }
  if (await getCurrentUser()) {
    redirect("/dashboard");
  }

  const translations = await getTranslations("Auth.reset");
  const { token } = await searchParams;

  if (!token) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{translations("title")}</CardTitle>
          <CardDescription>{translations("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            {translations("missing")}{" "}
            <Link href="/forgot-password" className="hover:underline">
              {translations("forgotLink")}
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    );
  }

  const user = await findValidResetToken(token);

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{translations("title")}</CardTitle>
          <CardDescription>{translations("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            {translations("expired")}{" "}
            <Link href="/forgot-password" className="hover:underline">
              {translations("forgotLink")}
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{translations("title")}</CardTitle>
        <CardDescription>{translations("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4 text-sm">
          {translations("forUser", { email: user.email })}
        </p>
        <ResetPasswordForm token={token} />
      </CardContent>
    </Card>
  );
}
