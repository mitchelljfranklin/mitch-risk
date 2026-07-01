import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth";
import { getAssessment } from "@/lib/db/assessments";
import { getVendor } from "@/lib/db/vendors";
import { QUESTION_TYPE_LABELS } from "@/lib/schemas/template";

import { formatResponseValue } from "@/lib/utils";

export const dynamic = "force-dynamic";

type ComparePageProps = {
  params: Promise<{ vendorId: string }>;
  searchParams: Promise<{ left?: string; right?: string }>;
};

export default async function ComparePage({
  params,
  searchParams,
}: ComparePageProps) {
  await requireUser();
  const { vendorId } = await params;
  const { left: leftId, right: rightId } = await searchParams;

  const vendor = await getVendor(vendorId);
  if (!vendor) notFound();

  if (!leftId || !rightId) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <Link
            href={`/vendors/${vendorId}`}
            className="text-muted-foreground text-sm hover:underline"
          >
            ← {vendor.name}
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">
            Compare assessments
          </h1>
        </div>
        <p className="text-muted-foreground text-sm">
          Select two assessments from the vendor page to compare them
          side‑by‑side. After opening two, bookmark this page with{" "}
          <code className="text-xs">?left=&lt;id&gt;&amp;right=&lt;id&gt;</code>
          .
        </p>
      </div>
    );
  }

  const [left, right] = await Promise.all([
    getAssessment(leftId),
    getAssessment(rightId),
  ]);

  if (!left || left.vendorId !== vendorId) notFound();
  if (!right || right.vendorId !== vendorId) notFound();

  const allQuestionIds = new Set([
    ...left.questions.map((q) => q.id),
    ...right.questions.map((q) => q.id),
  ]);

  const leftResponseMap = new Map(
    left.responses.map((r) => [r.assessmentQuestionId, r]),
  );
  const rightResponseMap = new Map(
    right.responses.map((r) => [r.assessmentQuestionId, r]),
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/vendors/${vendorId}`}
          className="text-muted-foreground text-sm hover:underline"
        >
          ← {vendor.name}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          Compare assessments
        </h1>
        <p className="text-muted-foreground text-sm">
          {left.title} ({left.status.toLowerCase()}) vs {right.title} (
          {right.status.toLowerCase()})
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="p-3 text-left font-medium">Question</th>
              <th className="p-3 text-left font-medium">{left.title}</th>
              <th className="p-3 text-left font-medium">{right.title}</th>
            </tr>
          </thead>
          <tbody>
            {[...allQuestionIds].map((qId) => {
              const lq = left.questions.find((q) => q.id === qId);
              const rq = right.questions.find((q) => q.id === qId);
              const lr = lq ? leftResponseMap.get(lq.id) : undefined;
              const rr = rq ? rightResponseMap.get(rq.id) : undefined;
              const lCompliant = lr?.isCompliant;
              const rCompliant = rr?.isCompliant;
              const changed =
                String(lr?.value ?? "") !== String(rr?.value ?? "");

              return (
                <tr
                  key={qId}
                  className={`border-b ${changed ? "bg-amber-50 dark:bg-amber-950/20" : ""}`}
                >
                  <td className="p-3">
                    <span className="text-muted-foreground text-xs">
                      {lq?.sectionTitle ?? rq?.sectionTitle ?? "—"}
                    </span>
                    <br />
                    <span>{lq?.text ?? rq?.text ?? "—"}</span>
                    <br />
                    <Badge variant="secondary" className="text-xs">
                      {
                        QUESTION_TYPE_LABELS[
                          lq?.type ?? rq?.type ?? "FREE_TEXT"
                        ]
                      }
                    </Badge>
                  </td>
                  <td className="p-3 align-top">
                    <span
                      className={
                        lCompliant === false
                          ? "text-destructive"
                          : lCompliant === true
                            ? "text-green-600"
                            : "text-muted-foreground"
                      }
                    >
                      {lr?.isNotApplicable
                        ? "N/A"
                        : formatResponseValue(lr?.value)}
                    </span>
                  </td>
                  <td className="p-3 align-top">
                    <span
                      className={
                        rCompliant === false
                          ? "text-destructive"
                          : rCompliant === true
                            ? "text-green-600"
                            : "text-muted-foreground"
                      }
                    >
                      {rr?.isNotApplicable
                        ? "N/A"
                        : formatResponseValue(rr?.value)}
                    </span>
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
