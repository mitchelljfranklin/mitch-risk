import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ComplianceRadar } from "@/components/compliance-radar";
import { EmptyState } from "@/components/empty-state";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getVendorDomainRadar, getVendorHeatmap } from "@/lib/db/compliance";
import { getFramework } from "@/lib/db/frameworks";
import { getVendor } from "@/lib/db/vendors";
import { formatPercent } from "@/lib/utils";

export const dynamic = "force-dynamic";

type HeatmapPageProps = {
  params: Promise<{ vendorId: string; frameworkId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

export async function generateMetadata({
  params,
}: HeatmapPageProps): Promise<Metadata> {
  const { vendorId } = await params;
  const vendor = await getVendor(vendorId);
  if (!vendor) return { title: "Vendor not found" };
  return { title: `Heatmap — ${vendor.name}` };
}

export default async function VendorHeatmapPage({
  params,
  searchParams,
}: HeatmapPageProps) {
  await requirePermission(PERMISSIONS.VENDORS_VIEW);
  const { vendorId, frameworkId } = await params;
  const sp = await searchParams;
  const returnTab = sp.tab ?? "";

  const [vendor, framework] = await Promise.all([
    getVendor(vendorId),
    getFramework(frameworkId),
  ]);
  if (!vendor || !framework) {
    notFound();
  }

  const controls = await getVendorHeatmap(vendorId, frameworkId);
  const radar = await getVendorDomainRadar(vendorId, frameworkId);

  const grouped = new Map<string, typeof controls>();
  for (const control of controls) {
    const list = grouped.get(control.domain) ?? [];
    list.push(control);
    grouped.set(control.domain, list);
  }

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <Breadcrumbs
        segments={[
          { label: "Vendors", href: "/vendors" },
          {
            label: vendor.name,
            href: returnTab
              ? `/vendors/${vendorId}?tab=${returnTab}`
              : `/vendors/${vendorId}`,
          },
          { label: `${framework.name} ${framework.version}` },
        ]}
      />
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {framework.name} {framework.version}
          </h1>
          <p className="text-muted-foreground text-sm">
            Domain compliance radar and control-level heatmap from recent
            assessments.
          </p>
        </div>
        {controls.length > 0 ? (
          <Button asChild variant="outline" size="sm">
            <a
              href={`/api/vendors/${vendorId}/frameworks/${frameworkId}/report`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Download PDF report
            </a>
          </Button>
        ) : null}
      </div>

      {controls.length === 0 ? (
        <EmptyState
          compact
          icon="assessments"
          title="No data available"
          description="No assessment data is available for this framework yet."
        />
      ) : (
        <div className="flex flex-col gap-6">
          <ComplianceRadar
            data={radar.domains}
            hasPrevious={radar.hasPrevious}
          />
          {[...grouped.entries()].map(([domain, domainControls]) => (
            <section key={domain} className="flex flex-col gap-2">
              <h2 className="text-muted-foreground text-sm font-medium">
                {domain}
              </h2>
              <div className="flex flex-col divide-y rounded-lg border">
                {domainControls.map((control) => (
                  <div key={control.id} className="flex items-center gap-3 p-3">
                    <span
                      className={`size-3 shrink-0 rounded-full ${
                        control.rag === "green"
                          ? "bg-[var(--rag-green)]"
                          : control.rag === "amber"
                            ? "bg-[var(--rag-amber)]"
                            : control.rag === "red"
                              ? "bg-[var(--rag-red)]"
                              : "bg-muted"
                      }`}
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
