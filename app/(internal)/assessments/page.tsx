import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireUser } from "@/lib/auth";
import { listAssessments } from "@/lib/db/assessments";
import { ASSESSMENT_STATUS_LABELS } from "@/lib/schemas/assessment";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Assessments" };

type AssessmentsPageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function AssessmentsPage({
  searchParams,
}: AssessmentsPageProps) {
  await requireUser();
  const sp = await searchParams;

  const filters = {
    query: sp.query,
    status: sp.status,
    fromDate: sp.from,
    toDate: sp.to,
  };

  const assessments = await listAssessments(filters);
  const hasFilters =
    Boolean(sp.query) ||
    Boolean(sp.status) ||
    Boolean(sp.from) ||
    Boolean(sp.to);

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
          <select
            id="status"
            name="status"
            defaultValue={sp.status ?? ""}
            className="border-input bg-background h-9 rounded-md border px-3 text-sm"
          >
            <option value="">All</option>
            {Object.entries(ASSESSMENT_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
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
        <p className="text-muted-foreground text-sm">
          {hasFilters
            ? "No assessments match the selected filters."
            : "No assessments yet. Create one from a vendor."}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {assessments.map((assessment) => (
            <Link
              key={assessment.id}
              href={`/assessments/${assessment.id}`}
              className="hover:bg-accent/40 flex items-center justify-between gap-3 rounded-md border p-3"
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium">{assessment.title}</span>
                <span className="text-muted-foreground text-xs">
                  {assessment.vendor.name}
                  {assessment.template
                    ? ` · ${assessment.template.name} v${assessment.template.version}`
                    : ""}
                  {assessment.dueDate
                    ? ` · due ${formatDate(assessment.dueDate)}`
                    : ""}
                </span>
              </div>
              <Badge variant="secondary">
                {ASSESSMENT_STATUS_LABELS[assessment.status]}
              </Badge>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
