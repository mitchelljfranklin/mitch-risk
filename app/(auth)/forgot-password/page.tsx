import type { Metadata } from "next";
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
import { countUsers } from "@/lib/db/users";

import { ForgotPasswordForm } from "./forgot-password-form";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Auth.forgot");
  return { title: t("title") };
}

export default async function ForgotPasswordPage() {
  if ((await countUsers()) === 0) {
    redirect("/setup");
  }
  if (await getCurrentUser()) {
    redirect("/dashboard");
  }

  const t = await getTranslations("Auth.forgot");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <ForgotPasswordForm />
      </CardContent>
    </Card>
  );
}
