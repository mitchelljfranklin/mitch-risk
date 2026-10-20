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
  const translations = await getTranslations("Auth.setup");
  return { title: translations("title") };
}

export default async function SetupPage() {
  if ((await countUsers()) > 0) {
    redirect("/login");
  }

  const translations = await getTranslations("Auth.setup");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{translations("cardTitle")}</CardTitle>
        <CardDescription>{translations("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <SetupForm />
      </CardContent>
    </Card>
  );
}
