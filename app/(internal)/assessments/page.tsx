import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AutoSubmitSelect } from "@/components/auto-submit-select";
import { AssessmentsTable } from "./assessments-table";
import { EmptyState } from "@/components/empty-state";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import {
  listAssessments,
  ASSESSMENT_SORTS,
  type AssessmentSort,
} from "@/lib/db/assessments";
import { ASSESSMENT_STATUS_LABELS } from "@/lib/schemas/assessment";

export const dynamic = "force-dynamic";

export const metadata = { title: "Assessments" };

type AssessmentsPageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function AssessmentsPage({
  searchParams,
}: AssessmentsPageProps) {
  await requirePermission(PERMISSIONS.ASSESSMENTS_VIEW);
  const sp = await searchParams;
  const overdue = sp.overdue === "1" || sp.overdue === "on";
  const sort = (sp.sort as AssessmentSort) || "created";
  const page = sp.page ? parseInt(sp.page, 10) || 1 : 1;

  const { assessments, totalCount, pageSize } = await listAssessments({
    query: sp.query,
    status: sp.status,
    fromDate: sp.from,
    toDate: sp.to,
    overdue,
    sort,
    page,
  });

  const hasFilters =
    Boolean(sp.query) ||
    Boolean(sp.status) ||
    Boolean(sp.from) ||
    Boolean(sp.to) ||
    overdue;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Assessments</h1>
        <p className="text-muted-foreground text-sm">
          Questionnaires sent to vendors.
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-xs" htmlFor="query">
            Search
          </label>
          <Input
            id="query"
            name="query"
            placeholder="Title or vendor..."
            defaultValue={sp.query ?? ""}
            className="w-48"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-xs" htmlFor="status">
            Status
          </label>
          <Select name="status" defaultValue={sp.status ?? ""}>
            <SelectTrigger id="status" className="w-40">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ASSESSMENT_STATUS_LABELS).map(
                ([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-xs" htmlFor="from">
            From
          </label>
          <Input
            id="from"
            name="from"
            type="date"
            defaultValue={sp.from ?? ""}
            className="w-36"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-xs" htmlFor="to">
            To
          </label>
          <Input
            id="to"
            name="to"
            type="date"
            defaultValue={sp.to ?? ""}
            className="w-36"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-xs" htmlFor="sort">
            Sort
          </label>
          <AutoSubmitSelect
            name="sort"
            defaultValue={sort}
            id="sort"
            className="w-44"
            ariaLabel="Sort assessments"
            options={Object.entries(ASSESSMENT_SORTS).map(([value, label]) => ({
              value,
              label,
            }))}
          />
        </div>
        <label className="mb-1.5 flex items-center gap-2 text-sm">
          <Checkbox name="overdue" value="1" defaultChecked={overdue} />
          Overdue only
        </label>
        <Button type="submit" variant="secondary" size="sm" className="mb-px">
          Filter
        </Button>
        {hasFilters ? (
          <Button asChild variant="ghost" size="sm" className="mb-px">
            <Link href="/assessments">Clear</Link>
          </Button>
        ) : null}
      </form>

      {assessments.length === 0 ? (
        hasFilters ? (
          <p className="text-muted-foreground text-sm">
            No assessments match the selected filters.
          </p>
        ) : (
          <EmptyState
            icon="assessments"
            title="No assessments yet"
            description="Create an assessment from a vendor to send a questionnaire."
          />
        )
      ) : (
        <AssessmentsTable
          assessments={assessments.map((assessment) => ({
            id: assessment.id,
            title: assessment.title,
            status: assessment.status,
            score: assessment.score,
            dueDate: assessment.dueDate?.toISOString() ?? null,
            vendorName: assessment.vendor.name,
            templateName: assessment.template?.name ?? null,
            templateVersion: assessment.template?.version ?? null,
          }))}
          initialSort={sort}
          page={page}
          pageSize={pageSize}
          totalCount={totalCount}
        />
      )}
    </div>
  );
}
