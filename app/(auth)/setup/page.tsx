import { redirect } from "next/navigation";

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

export const metadata = { title: "Create admin" };

export default async function SetupPage() {
  if ((await countUsers()) > 0) {
    redirect("/login");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create the first admin</CardTitle>
        <CardDescription>
          Set up the initial administrator account to start managing vendor
          risk.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SetupForm />
      </CardContent>
    </Card>
  );
}
