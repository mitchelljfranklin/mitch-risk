import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
import { getVendor } from "@/lib/db/vendors";
import { buildBackParam } from "@/lib/nav";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const translations = await getTranslations("Assessments.list");
  return { title: translations("title") };
}

type AssessmentsPageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function AssessmentsPage({
  searchParams,
}: AssessmentsPageProps) {
  await requirePermission(PERMISSIONS.ASSESSMENTS_VIEW);
  const translations = await getTranslations("Assessments.list");
  const commonTranslations = await getTranslations("Common");
  const searchParameters = await searchParams;
  const overdue =
    searchParameters.overdue === "1" || searchParameters.overdue === "on";
  const sort = (searchParameters.sort as AssessmentSort) || "created";
  const pageNumber = searchParameters.page
    ? parseInt(searchParameters.page, 10) || 1
    : 1;

  const { assessments, totalCount, pageSize } = await listAssessments({
    query: searchParameters.query,
    status: searchParameters.status,
    vendorId: searchParameters.vendorId,
    fromDate: searchParameters.from,
    toDate: searchParameters.to,
    overdue,
    sort,
    page: pageNumber,
  });

  const hasFilters =
    Boolean(searchParameters.query) ||
    Boolean(searchParameters.status) ||
    Boolean(searchParameters.vendorId) ||
    Boolean(searchParameters.from) ||
    Boolean(searchParameters.to) ||
    overdue;

  const filteredVendorName = searchParameters.vendorId
    ? ((await getVendor(searchParameters.vendorId))?.name ?? null)
    : null;

  const backParam = buildBackParam("/assessments", searchParameters, [
    "query",
    "status",
    "vendorId",
    "from",
    "to",
    "overdue",
    "sort",
    "page",
  ]);

  const statusOptions = Object.keys(ASSESSMENT_STATUS_LABELS).map((status) => ({
    value: status,
    label: commonTranslations.has(`assessmentStatuses.${status}`)
      ? commonTranslations(`assessmentStatuses.${status}`)
      : status,
  }));

  const sortOptions = ASSESSMENT_SORTS.map((value) => ({
    value,
    label: translations(`sorts.${value}`),
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {translations("title")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {filteredVendorName
            ? translations("subtitleForVendor", {
                vendorName: filteredVendorName,
              })
            : translations("subtitle")}
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-xs" htmlFor="query">
            {translations("filters.search")}
          </label>
          <Input
            id="query"
            name="query"
            placeholder={translations("filters.searchPlaceholder")}
            defaultValue={searchParameters.query ?? ""}
            className="w-48"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-xs" htmlFor="status">
            {translations("filters.status")}
          </label>
          <AutoSubmitSelect
            name="status"
            defaultValue={searchParameters.status ?? ""}
            key={`status-${searchParameters.status ?? ""}`}
            emptyOptionLabel={translations("filters.allStatuses")}
            id="status"
            className="w-40"
            ariaLabel={translations("filters.statusAriaLabel")}
            options={statusOptions}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-xs" htmlFor="from">
            {translations("filters.from")}
          </label>
          <Input
            id="from"
            name="from"
            type="date"
            defaultValue={searchParameters.from ?? ""}
            className="w-36"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-xs" htmlFor="to">
            {translations("filters.to")}
          </label>
          <Input
            id="to"
            name="to"
            type="date"
            defaultValue={searchParameters.to ?? ""}
            className="w-36"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-xs" htmlFor="sort">
            {translations("filters.sort")}
          </label>
          <AutoSubmitSelect
            name="sort"
            defaultValue={sort}
            key={`sort-${sort ?? ""}`}
            id="sort"
            className="w-44"
            ariaLabel={translations("filters.sortAriaLabel")}
            options={sortOptions}
          />
        </div>
        <label className="mb-1.5 flex items-center gap-2 text-sm">
          <Checkbox name="overdue" value="1" defaultChecked={overdue} />
          {translations("filters.overdueOnly")}
        </label>
        <Button type="submit" variant="secondary" size="sm" className="mb-px">
          {translations("filters.apply")}
        </Button>
        {hasFilters ? (
          <Button asChild variant="ghost" size="sm" className="mb-px">
            <Link href="/assessments">{translations("filters.clear")}</Link>
          </Button>
        ) : null}
      </form>

      {assessments.length === 0 ? (
        hasFilters ? (
          <p className="text-muted-foreground text-sm">
            {translations("emptyFiltered")}
          </p>
        ) : (
          <EmptyState
            icon="assessments"
            title={translations("emptyTitle")}
            description={translations("emptyDescription")}
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
          backParam={backParam}
          initialSort={sort}
          page={pageNumber}
          pageSize={pageSize}
          totalCount={totalCount}
        />
      )}
    </div>
  );
}
