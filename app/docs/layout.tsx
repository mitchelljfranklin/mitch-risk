import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";

export default async function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return children;
}
