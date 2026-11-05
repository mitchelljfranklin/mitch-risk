import { Breadcrumbs } from "@/components/breadcrumbs";
import { EmptyState } from "@/components/empty-state";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getAssessment } from "@/lib/db/assessments";
import { getVendor, listVendorOptions } from "@/lib/db/vendors";
import { ScoreBadge } from "@/components/score-badge";
import { formatResponseValue } from "@/lib/utils";
import { compareResponses } from "@/lib/compare";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const translations = await getTranslations("CompareVendors");
  return { title: translations("metaTitle") };
}

type ComparePageProps = {
  searchParams: Promise<{ a?: string; b?: string }>;
};

export default async function CompareVendorsPage({
  searchParams,
}: ComparePageProps) {
  await requirePermission(PERMISSIONS.VENDORS_VIEW);
  const translations = await getTranslations("CompareVendors");
  const shellTranslations = await getTranslations("Shell.workspace");
  const questionTypeTranslations = await getTranslations(
    "Common.questionTypes",
  );
  const statusTranslations = await getTranslations("Common.assessmentStatuses");
  const { a: vendorAId, b: vendorBId } = await searchParams;

  if (!vendorAId || !vendorBId) {
    const vendorOptions = await listVendorOptions();
    return (
      <div className="flex flex-col gap-6">
        <Breadcrumbs
          segments={[
            { label: shellTranslations("vendors"), href: "/vendors" },
            { label: translations("breadcrumb") },
          ]}
        />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {translations("title")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {translations("subtitle")}
          </p>
        </div>

        {vendorOptions.length < 2 ? (
          <EmptyState
            compact
            icon="vendors"
            title={translations("notEnoughVendorsTitle")}
            description={translations("notEnoughVendorsDescription")}
          />
        ) : (
          <form className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="a">{translations("vendorA")}</Label>
              <Select name="a" defaultValue={vendorAId ?? undefined}>
                <SelectTrigger id="a" className="w-56">
                  <SelectValue placeholder={translations("selectVendor")} />
                </SelectTrigger>
                <SelectContent>
                  {vendorOptions.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="b">{translations("vendorB")}</Label>
              <Select name="b" defaultValue={vendorBId ?? undefined}>
                <SelectTrigger id="b" className="w-56">
                  <SelectValue placeholder={translations("selectVendor")} />
                </SelectTrigger>
                <SelectContent>
                  {vendorOptions.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" size="sm" className="mb-px">
              {translations("compare")}
            </Button>
          </form>
        )}
      </div>
    );
  }

  const [vendorA, vendorB] = await Promise.all([
    getVendor(vendorAId),
    getVendor(vendorBId),
  ]);

  if (!vendorA || !vendorB) notFound();

  const completedA = vendorA.assessments
    .filter(
      (assessment) =>
        assessment.status === "COMPLETED" ||
        assessment.status === "UNDER_REVIEW",
    )
    .sort(
      (x, y) =>
        (y.submittedAt?.getTime() ?? 0) - (x.submittedAt?.getTime() ?? 0),
    )[0];
  const completedB = vendorB.assessments
    .filter(
      (assessment) =>
        assessment.status === "COMPLETED" ||
        assessment.status === "UNDER_REVIEW",
    )
    .sort(
      (x, y) =>
        (y.submittedAt?.getTime() ?? 0) - (x.submittedAt?.getTime() ?? 0),
    )[0];

  if (!completedA || !completedB) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {translations("title")}
          </h1>
        </div>
        <EmptyState
          compact
          icon="assessments"
          title={translations("notEnoughAssessmentsTitle")}
          description={translations("notEnoughAssessmentsDescription")}
        />
      </div>
    );
  }

  const [assessmentA, assessmentB] = await Promise.all([
    getAssessment(completedA.id),
    getAssessment(completedB.id),
  ]);

  if (!assessmentA || !assessmentB) notFound();

  const aScore = assessmentA.score;
  const bScore = assessmentB.score;

  const aResponseMap = new Map(
    assessmentA.responses.map((response) => [
      response.assessmentQuestionId,
      response,
    ]),
  );
  const bResponseMap = new Map(
    assessmentB.responses.map((response) => [
      response.assessmentQuestionId,
      response,
    ]),
  );

  // Match questions by text content for cross-template comparison
  const aQuestionsByText = new Map(
    assessmentA.questions.map((question) => [question.text, question]),
  );
  const bQuestionsByText = new Map(
    assessmentB.questions.map((question) => [question.text, question]),
  );
  const allTexts = new Set([
    ...aQuestionsByText.keys(),
    ...bQuestionsByText.keys(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        segments={[
          { label: shellTranslations("vendors"), href: "/vendors" },
          { label: translations("breadcrumb") },
        ]}
      />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {translations("title")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {translations("comparisonSubtitle", {
            vendorA: vendorA.name,
            vendorB: vendorB.name,
          })}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{vendorA.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <ScoreBadge score={aScore} size="lg" />
            <p className="text-muted-foreground text-xs">
              {translations("statusLabel", {
                title: assessmentA.title,
                status: statusTranslations.has(assessmentA.status)
                  ? statusTranslations(assessmentA.status)
                  : assessmentA.status.toLowerCase(),
              })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{vendorB.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <ScoreBadge score={bScore} size="lg" />
            <p className="text-muted-foreground text-xs">
              {translations("statusLabel", {
                title: assessmentB.title,
                status: statusTranslations.has(assessmentB.status)
                  ? statusTranslations(assessmentB.status)
                  : assessmentB.status.toLowerCase(),
              })}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-background sticky top-14">
            <tr className="bg-muted/50 border-b">
              <th scope="col" className="p-3 text-left font-medium">
                {translations("question")}
              </th>
              <th scope="col" className="p-3 text-left font-medium">
                {vendorA.name}
              </th>
              <th scope="col" className="p-3 text-left font-medium">
                {vendorB.name}
              </th>
            </tr>
          </thead>
          <tbody>
            {[...allTexts].sort().map((text) => {
              const aq = aQuestionsByText.get(text);
              const bq = bQuestionsByText.get(text);
              const ar = aq ? aResponseMap.get(aq.id) : undefined;
              const br = bq ? bResponseMap.get(bq.id) : undefined;
              const aCompliant = ar?.isCompliant;
              const bCompliant = br?.isCompliant;

              const aAnswer = ar?.isNotApplicable
                ? translations("notApplicable")
                : formatResponseValue(ar?.value);
              const bAnswer = br?.isNotApplicable
                ? translations("notApplicable")
                : formatResponseValue(br?.value);
              const answersDiffer = aq && bq && aAnswer !== bAnswer;

              const diff = compareResponses(
                { value: ar?.value, isCompliant: ar?.isCompliant ?? null },
                { value: br?.value, isCompliant: br?.isCompliant ?? null },
              );

              return (
                <tr
                  key={text}
                  className={`even:bg-muted/30 border-b ${answersDiffer ? "bg-accent/20" : ""}`}
                >
                  <td className="p-3">
                    <span className="text-muted-foreground text-xs">
                      {aq?.sectionTitle ?? bq?.sectionTitle ?? "—"}
                    </span>
                    <br />
                    <span>{text}</span>
                    <br />
                    <Badge variant="secondary" className="text-xs">
                      {questionTypeTranslations.has(aq?.type ?? bq?.type ?? "")
                        ? questionTypeTranslations(
                            aq?.type ?? bq?.type ?? "FREE_TEXT",
                          )
                        : (aq?.type ?? bq?.type ?? "FREE_TEXT")}
                    </Badge>
                  </td>
                  <td className="p-3 align-top">
                    {aq ? (
                      <>
                        <span
                          className={
                            aCompliant === false
                              ? "text-destructive"
                              : aCompliant === true
                                ? "text-[var(--rag-green)]"
                                : "text-muted-foreground"
                          }
                        >
                          {aAnswer}
                        </span>
                        {diff.complianceDegraded ? (
                          <Badge
                            variant="destructive"
                            className="ml-1 text-[10px]"
                          >
                            ↓
                          </Badge>
                        ) : diff.complianceImproved ? (
                          <Badge className="ml-1 bg-[var(--rag-green)] text-[10px] text-white">
                            ↑
                          </Badge>
                        ) : null}
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="p-3 align-top">
                    {bq ? (
                      <>
                        <span
                          className={
                            bCompliant === false
                              ? "text-destructive"
                              : bCompliant === true
                                ? "text-[var(--rag-green)]"
                                : "text-muted-foreground"
                          }
                        >
                          {bAnswer}
                        </span>
                        {diff.complianceChanged ? (
                          <Badge variant="outline" className="ml-1 text-[10px]">
                            {translations("changed")}
                          </Badge>
                        ) : null}
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
