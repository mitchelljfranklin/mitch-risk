import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { ScoreBadge } from "@/components/score-badge";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { ASSESSMENT_STATUS_LABELS } from "@/lib/schemas/assessment";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Self-assessment" };

const INTERNAL_VENDOR_NAME = "My Organization";

export default async function SelfAssessmentPage() {
  const user = await requirePermission(PERMISSIONS.ASSESSMENTS_CREATE);

  let vendor = await prisma.vendor.findFirst({
    where: { name: INTERNAL_VENDOR_NAME },
  });

  if (!vendor) {
    vendor = await prisma.vendor.create({
      data: {
        name: INTERNAL_VENDOR_NAME,
        contactEmail: "internal@local",
        tier: null,
        ownerId: user.id,
      },
    });
  } else if (!vendor.ownerId) {
    await prisma.vendor.update({
      where: { id: vendor.id },
      data: { ownerId: user.id },
    });
  }

  const assessments = await prisma.assessment.findMany({
    where: { vendorId: vendor.id },
    orderBy: { createdAt: "desc" },
    include: {
      template: { select: { name: true, version: true } },
    },
    take: 50,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Self-assessment
          </h1>
          <p className="text-muted-foreground text-sm">
            Assess your own organization against compliance frameworks using the
            same questionnaire portal your vendors use.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm">
            <Link href="/self-assessment/new">Start new assessment</Link>
          </Button>
        </div>
      </div>

      {assessments.length === 0 ? (
        <EmptyState
          icon="assessments"
          title="No self-assessments yet"
          description="Start your first self-assessment to evaluate your organization against ISO 27001, SOC 2, or other frameworks."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {assessments.map((assessment) => (
            <Link
              key={assessment.id}
              href={`/assessments/${assessment.id}`}
              className="hover:bg-accent/40 flex items-center justify-between gap-4 rounded-lg border p-4 transition-colors"
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-sm font-medium">
                  {assessment.title}
                </span>
                <span className="text-muted-foreground truncate text-xs">
                  {assessment.template
                    ? `${assessment.template.name} v${assessment.template.version}`
                    : "No template"}{" "}
                  · {formatDate(assessment.createdAt)}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {ASSESSMENT_STATUS_LABELS[assessment.status] ??
                    assessment.status}
                </Badge>
                {assessment.score !== null ? (
                  <ScoreBadge score={assessment.score} size="sm" />
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
