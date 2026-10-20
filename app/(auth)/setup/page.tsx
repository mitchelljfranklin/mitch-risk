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
import { countUsers } from "@/lib/db/users";

import { SetupForm } from "./setup-form";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Auth.setup");
  return { title: t("title") };
}

export default async function SetupPage() {
  if ((await countUsers()) > 0) {
    redirect("/login");
  }

  const t = await getTranslations("Auth.setup");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("cardTitle")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <SetupForm />
      </CardContent>
    </Card>
  );
}
