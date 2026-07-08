import Link from "next/link";

import { Badge } from "@/components/ui/badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AssessmentStatusBadge } from "@/components/assessment-status-badge";
import { ScoreBadge } from "@/components/score-badge";
import { AutoSubmitSelect } from "@/components/auto-submit-select";
import { EmptyState } from "@/components/empty-state";
import { Pagination } from "@/components/pagination";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import {
  listAssessments,
  ASSESSMENT_SORTS,
  type AssessmentSort,
} from "@/lib/db/assessments";
import {
  ASSESSMENT_STATUS_LABELS,
  isAssessmentOverdue,
} from "@/lib/schemas/assessment";
import { formatDate } from "@/lib/utils";

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

  const STATUS_ACCENT: Record<string, string> = {
    SUBMITTED: "border-l-[var(--rag-amber)]",
    UNDER_REVIEW: "border-l-blue-500",
    COMPLETED: "border-l-[var(--rag-green)]",
  };

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
        <>
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Assessment · Vendor</TableHead>
                  <TableHead className="hidden w-16 text-right sm:table-cell">
                    Score
                  </TableHead>
                  <TableHead className="hidden w-28 text-right sm:table-cell">
                    Status
                  </TableHead>
                  <TableHead className="hidden w-24 text-right sm:table-cell">
                    Due
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assessments.map((assessment) => {
                  const isOverdue = isAssessmentOverdue(
                    assessment.dueDate,
                    assessment.status,
                  );
                  const accentClass = isOverdue
                    ? "border-l-destructive border-l-4"
                    : (STATUS_ACCENT[assessment.status] ?? "");
                  return (
                    <TableRow key={assessment.id} className={accentClass}>
                      <TableCell className="p-3">
                        <Link
                          href={`/assessments/${assessment.id}`}
                          className="block"
                        >
                          <span className="truncate text-sm font-medium">
                            {assessment.title}
                          </span>
                          <span className="text-muted-foreground block truncate text-xs">
                            {assessment.vendor.name}
                            {assessment.template
                              ? ` · ${assessment.template.name} v${assessment.template.version}`
                              : ""}
                            {assessment.dueDate ? (
                              <span
                                className={
                                  isOverdue ? "text-[var(--rag-red)]" : ""
                                }
                              >
                                {` · due ${formatDate(assessment.dueDate)}`}
                              </span>
                            ) : (
                              ""
                            )}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell className="hidden p-3 text-right sm:table-cell">
                        {assessment.score !== null ? (
                          <ScoreBadge score={assessment.score} size="sm" />
                        ) : null}
                      </TableCell>
                      <TableCell className="hidden p-3 text-right sm:table-cell">
                        {isOverdue ? (
                          <Badge variant="destructive">Overdue</Badge>
                        ) : null}{" "}
                        <AssessmentStatusBadge status={assessment.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden p-3 text-right text-xs sm:table-cell">
                        {assessment.dueDate
                          ? formatDate(assessment.dueDate)
                          : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <Pagination
            page={page}
            pageSize={pageSize}
            totalCount={totalCount}
            itemLabel="assessments"
          />
        </>
      )}
    </div>
  );
}
