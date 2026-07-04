import { cookies, headers } from "next/headers";
import { getAssessmentByToken, isTokenExpired } from "@/lib/db/assessments";
import { getClientIp } from "@/lib/client-ip";
import { rateLimit } from "@/lib/rate-limit";
import { formatDate } from "@/lib/utils";
import { getAppearanceSettings, getFileSettings } from "@/lib/settings";
import { ThemeToggle } from "@/components/theme-toggle";

const PORTAL_PAGE_LOADS_PER_MINUTE = 30;

import { PortalQuestionnaire } from "./portal-questionnaire";
import { PasswordGate } from "./password-gate";

export const dynamic = "force-dynamic";

export const metadata = { title: "Vendor questionnaire" };

type PortalPageProps = {
  params: Promise<{ token: string }>;
};

function normalizeAnswerValue(
  value: unknown,
): string | number | boolean | string[] | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (Array.isArray(value)) {
    return value.map(String);
  }
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  return String(value);
}

function PortalShell({
  children,
  logoUrl,
}: {
  children: React.ReactNode;
  logoUrl: string | null;
}) {
  return (
    <div className="mx-auto flex min-h-svh w-full max-w-2xl flex-col gap-6 p-6">
      <noscript>
        <p className="rounded-md border border-amber-500 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          JavaScript is required to complete this questionnaire. Please enable
          JavaScript in your browser settings.
        </p>
      </noscript>
      {logoUrl ? (
        <div className="flex justify-center">
          <img
            src={logoUrl}
            alt="Logo"
            width={80}
            height={40}
            className="h-10 w-auto object-contain"
          />
        </div>
      ) : null}
      {children}
    </div>
  );
}

function PortalMessage({
  title,
  body,
  logoUrl,
}: {
  title: string;
  body: string;
  logoUrl: string | null;
}) {
  return (
    <PortalShell logoUrl={logoUrl}>
      <div className="mt-24 text-center">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        <p className="text-muted-foreground mt-2 text-sm">{body}</p>
      </div>
    </PortalShell>
  );
}

export default async function PortalPage({ params }: PortalPageProps) {
  const { token } = await params;

  const requestHeaders = await headers();
  const clientIp = getClientIp(requestHeaders);
  const withinRateLimit = rateLimit(
    "portal-page",
    clientIp,
    PORTAL_PAGE_LOADS_PER_MINUTE,
  );

  const appearance = await getAppearanceSettings();
  const logoUrl = appearance.logoKey ? "/api/brand/logo" : null;

  if (!withinRateLimit) {
    return (
      <PortalMessage
        title="Link not found"
        body="This questionnaire link is invalid."
        logoUrl={logoUrl}
      />
    );
  }

  const [assessment, fileSettings] = await Promise.all([
    getAssessmentByToken(token),
    getFileSettings(),
  ]);

  if (!assessment) {
    return (
      <PortalMessage
        title="Link not found"
        body="This questionnaire link is invalid."
        logoUrl={logoUrl}
      />
    );
  }

  const isExpired = isTokenExpired(assessment.tokenExpiresAt);
  if (isExpired) {
    return (
      <PortalMessage
        title="Link expired"
        body="This questionnaire link has expired. Please contact the requester for a new link."
        logoUrl={logoUrl}
      />
    );
  }

  if (
    assessment.status === "SUBMITTED" ||
    assessment.status === "UNDER_REVIEW" ||
    assessment.status === "COMPLETED"
  ) {
    const responseMap = new Map(
      assessment.responses.map((response) => [
        response.assessmentQuestionId,
        response,
      ]),
    );
    return (
      <PortalShell logoUrl={logoUrl}>
        <div className="flex flex-col gap-6">
          <header className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {assessment.title} — submitted
              </h1>
              <p className="text-muted-foreground text-sm">
                {assessment.vendor.name}
              </p>
            </div>
            <ThemeToggle />
          </header>
          <div className="rounded-md border border-[var(--rag-green)] bg-[var(--rag-green)]/10 px-4 py-3">
            <p className="text-sm font-medium">
              ✓ Your responses have been submitted.
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              The requester will review your answers and may request
              clarifications. You can return to this link to see any updates.
            </p>
          </div>
          {assessment.questions.map((question) => {
            const response = responseMap.get(question.id);
            const review = response?.review;
            return (
              <div key={question.id} className="rounded-md border p-4">
                <p className="text-sm font-medium">{question.text}</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  {response?.isNotApplicable
                    ? "N/A"
                    : response
                      ? String(response.value ?? "—")
                      : "—"}
                </p>
                {review ? (
                  <p className="text-muted-foreground mt-1 text-xs">
                    <span
                      className={
                        review.decision === "APPROVED"
                          ? "text-[var(--rag-green)]"
                          : "text-muted-foreground"
                      }
                    >
                      {review.decision === "CLARIFICATION_REQUESTED"
                        ? "Clarification requested"
                        : review.decision.toLowerCase()}
                    </span>
                    {review.note ? ` — ${review.note}` : ""}
                  </p>
                ) : null}
              </div>
            );
          })}
          {assessment.comments.length > 0 ? (
            <div className="flex flex-col gap-2">
              <h2 className="text-sm font-medium">Comments</h2>
              {assessment.comments.map((comment) => (
                <div key={comment.id} className="rounded-md border p-3">
                  <p className="text-muted-foreground text-xs">
                    {comment.authorName} · {formatDate(comment.createdAt)}
                  </p>
                  <p className="text-sm">{comment.body}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </PortalShell>
    );
  }

  if (assessment.status !== "SENT" && assessment.status !== "IN_PROGRESS") {
    return (
      <PortalMessage
        title="Not available"
        body="This questionnaire is not currently available."
        logoUrl={logoUrl}
      />
    );
  }

  if (assessment.portalPasswordHash) {
    const cookieStore = await cookies();
    const portalAuthCookie = cookieStore.get("portal-auth");
    if (!portalAuthCookie || portalAuthCookie.value !== token) {
      return (
        <PortalShell logoUrl={logoUrl}>
          <PasswordGate token={token} />
        </PortalShell>
      );
    }
  }

  const questions = assessment.questions.map((question) => ({
    id: question.id,
    sectionTitle: question.sectionTitle,
    text: question.text,
    helpText: question.helpText,
    type: question.type as string,
    required: question.required,
    options: Array.isArray(question.options)
      ? question.options.map(String)
      : [],
    conditionalLogic: question.conditionalLogic ?? null,
  }));

  const initialAnswers = assessment.responses.map((response) => ({
    assessmentQuestionId: response.assessmentQuestionId,
    value: normalizeAnswerValue(response.value),
    isNotApplicable: response.isNotApplicable,
  }));

  const reviewByQuestionId: Record<
    string,
    { decision: string; note: string | null }
  > = {};
  for (const response of assessment.responses) {
    if (response.review) {
      reviewByQuestionId[response.assessmentQuestionId] = {
        decision: response.review.decision,
        note: response.review.note,
      };
    }
  }

  return (
    <PortalShell logoUrl={logoUrl}>
      {assessment.status === "IN_PROGRESS" ? (
        <div className="rounded-md border border-[var(--rag-amber)] bg-[var(--rag-amber)]/10 px-4 py-3">
          <p className="text-sm font-medium">
            Additional information has been requested.
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            Please review the flagged questions and resubmit when ready.
          </p>
        </div>
      ) : null}
      <PortalQuestionnaire
        token={token}
        title={assessment.title}
        vendorName={assessment.vendor.name}
        tokenExpiresAt={assessment.tokenExpiresAt?.toISOString() ?? null}
        questions={questions}
        initialAnswers={initialAnswers}
        initialEvidence={assessment.evidence}
        reviewByQuestionId={reviewByQuestionId}
        initialComments={assessment.comments.filter(
          (c) => c.authorType === "VENDOR" || c.authorType === "INTERNAL",
        )}
        maxUploadMb={fileSettings.maxUploadMb}
        allowedExtensions={fileSettings.allowedExtensions}
      />
    </PortalShell>
  );
}
