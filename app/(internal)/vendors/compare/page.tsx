import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getAssessment } from "@/lib/db/assessments";
import { getVendor } from "@/lib/db/vendors";
import { QUESTION_TYPE_LABELS } from "@/lib/schemas/template";
import { formatPercent, formatResponseValue } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Compare vendors" };

type ComparePageProps = {
  searchParams: Promise<{ a?: string; b?: string }>;
};

export default async function CompareVendorsPage({
  searchParams,
}: ComparePageProps) {
  await requirePermission(PERMISSIONS.VENDORS_VIEW);
  const { a: vendorAId, b: vendorBId } = await searchParams;

  if (!vendorAId || !vendorBId) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Compare vendors
          </h1>
          <p className="text-muted-foreground text-sm">
            Select two vendors from the vendor list to compare their latest
            completed assessments side‑by‑side. Use{" "}
            <code className="text-xs">
              ?a=&lt;vendor-id&gt;&amp;b=&lt;vendor-id&gt;
            </code>
            .
          </p>
        </div>
      </div>
    );
  }

  const [vendorA, vendorB] = await Promise.all([
    getVendor(vendorAId),
    getVendor(vendorBId),
  ]);

  if (!vendorA || !vendorB) notFound();

  const completedA = vendorA.assessments
    .filter((a) => a.status === "COMPLETED" || a.status === "UNDER_REVIEW")
    .sort(
      (x, y) =>
        (y.submittedAt?.getTime() ?? 0) - (x.submittedAt?.getTime() ?? 0),
    )[0];
  const completedB = vendorB.assessments
    .filter((a) => a.status === "COMPLETED" || a.status === "UNDER_REVIEW")
    .sort(
      (x, y) =>
        (y.submittedAt?.getTime() ?? 0) - (x.submittedAt?.getTime() ?? 0),
    )[0];

  if (!completedA || !completedB) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Compare vendors
          </h1>
        </div>
        <p className="text-muted-foreground text-sm">
          Both vendors must have at least one completed or under‑review
          assessment to compare.
        </p>
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
    assessmentA.responses.map((r) => [r.assessmentQuestionId, r]),
  );
  const bResponseMap = new Map(
    assessmentB.responses.map((r) => [r.assessmentQuestionId, r]),
  );

  // Match questions by text content for cross-template comparison
  const aQuestionsByText = new Map(
    assessmentA.questions.map((q) => [q.text, q]),
  );
  const bQuestionsByText = new Map(
    assessmentB.questions.map((q) => [q.text, q]),
  );
  const allTexts = new Set([
    ...aQuestionsByText.keys(),
    ...bQuestionsByText.keys(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/vendors"
          className="text-muted-foreground text-sm hover:underline"
        >
          ← Vendors
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          Compare vendors
        </h1>
        <p className="text-muted-foreground text-sm">
          {vendorA.name} vs {vendorB.name}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{vendorA.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {aScore !== null ? formatPercent(aScore) : "—"}
            </p>
            <p className="text-muted-foreground text-xs">
              {assessmentA.title} · {assessmentA.status.toLowerCase()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{vendorB.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {bScore !== null ? formatPercent(bScore) : "—"}
            </p>
            <p className="text-muted-foreground text-xs">
              {assessmentB.title} · {assessmentB.status.toLowerCase()}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="p-3 text-left font-medium">Question</th>
              <th className="p-3 text-left font-medium">{vendorA.name}</th>
              <th className="p-3 text-left font-medium">{vendorB.name}</th>
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

              return (
                <tr key={text} className="border-b">
                  <td className="p-3">
                    <span className="text-muted-foreground text-xs">
                      {aq?.sectionTitle ?? bq?.sectionTitle ?? "—"}
                    </span>
                    <br />
                    <span>{text}</span>
                    <br />
                    <Badge variant="secondary" className="text-xs">
                      {
                        QUESTION_TYPE_LABELS[
                          aq?.type ?? bq?.type ?? "FREE_TEXT"
                        ]
                      }
                    </Badge>
                  </td>
                  <td className="p-3 align-top">
                    {aq ? (
                      <span
                        className={
                          aCompliant === false
                            ? "text-destructive"
                            : aCompliant === true
                              ? "text-[var(--rag-green)]"
                              : "text-muted-foreground"
                        }
                      >
                        {ar?.isNotApplicable
                          ? "N/A"
                          : formatResponseValue(ar?.value)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="p-3 align-top">
                    {bq ? (
                      <span
                        className={
                          bCompliant === false
                            ? "text-destructive"
                            : bCompliant === true
                              ? "text-[var(--rag-green)]"
                              : "text-muted-foreground"
                        }
                      >
                        {br?.isNotApplicable
                          ? "N/A"
                          : formatResponseValue(br?.value)}
                      </span>
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
