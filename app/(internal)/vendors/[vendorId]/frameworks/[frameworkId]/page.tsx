import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getVendorHeatmap } from "@/lib/db/compliance";
import { getFramework } from "@/lib/db/frameworks";
import { getVendor } from "@/lib/db/vendors";
import { formatPercent } from "@/lib/utils";

export const dynamic = "force-dynamic";

type HeatmapPageProps = {
  params: Promise<{ vendorId: string; frameworkId: string }>;
};

export async function generateMetadata({
  params,
}: HeatmapPageProps): Promise<Metadata> {
  const { vendorId } = await params;
  const vendor = await getVendor(vendorId);
  if (!vendor) return { title: "Vendor not found" };
  return { title: `Heatmap — ${vendor.name}` };
}

export default async function VendorHeatmapPage({ params }: HeatmapPageProps) {
  await requirePermission(PERMISSIONS.VENDORS_VIEW);
  const { vendorId, frameworkId } = await params;

  const [vendor, framework] = await Promise.all([
    getVendor(vendorId),
    getFramework(frameworkId),
  ]);
  if (!vendor || !framework) {
    notFound();
  }

  const controls = await getVendorHeatmap(vendorId, frameworkId);

  const grouped = new Map<string, typeof controls>();
  for (const control of controls) {
    const list = grouped.get(control.domain) ?? [];
    list.push(control);
    grouped.set(control.domain, list);
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <Link
          href={`/vendors/${vendorId}`}
          className="text-muted-foreground text-sm hover:underline"
        >
          ← {vendor.name}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          {framework.name} {framework.version}
        </h1>
        <p className="text-muted-foreground text-sm">
          Control compliance heatmap from the latest assessment.
        </p>
      </div>

      {controls.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No assessment data available yet.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {[...grouped.entries()].map(([domain, domainControls]) => (
            <section key={domain} className="flex flex-col gap-2">
              <h2 className="text-muted-foreground text-sm font-medium">
                {domain}
              </h2>
              <div className="flex flex-col divide-y rounded-lg border">
                {domainControls.map((control) => (
                  <div key={control.id} className="flex items-center gap-3 p-3">
                    <span
                      className={`size-3 shrink-0 rounded-full ${control.rag === "green" ? "bg-[var(--rag-green)]" : control.rag === "amber" ? "bg-[var(--rag-amber)]" : control.rag === "red" ? "bg-[var(--rag-red)]" : "bg-muted"}`}
                    />
                    <Badge variant="outline" className="font-mono">
                      {control.code}
                    </Badge>
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {control.title}
                    </span>
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {control.rag === "none"
                        ? "—"
                        : formatPercent(control.complianceRatio)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
