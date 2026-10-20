import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { getFormatter, getTranslations } from "next-intl/server";
import { getAssessmentByToken, isTokenExpired } from "@/lib/db/assessments";
import { getClientIp } from "@/lib/client-ip";
import { hashWithSecret } from "@/lib/crypto";
import { timingSafeEqualString } from "@/lib/timing-safe";
import { rateLimit } from "@/lib/rate-limit";
import { isNoteVisibleToVendor } from "@/lib/portal";
import {
  getAppearanceSettings,
  getAssessmentSettings,
  getFileSettings,
} from "@/lib/settings";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";

import { PortalQuestionnaire } from "./portal-questionnaire";
import { PasswordGate } from "./password-gate";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Portal");
  return { title: t("metaTitle") };
}

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
  noscriptText,
  logoAlt,
}: {
  children: React.ReactNode;
  logoUrl: string | null;
  noscriptText: string;
  logoAlt: string;
}) {
  return (
    <div className="mx-auto flex min-h-svh w-full max-w-2xl flex-col gap-6 p-6">
      <div className="flex items-center justify-end gap-2">
        <LocaleSwitcher />
        <ThemeToggle />
      </div>
      <noscript>
        <p className="border-warning/50 bg-warning/10 rounded-md border p-3 text-sm">
          {noscriptText}
        </p>
      </noscript>
      {logoUrl ? (
        <div className="flex justify-center">
          <img
            src={logoUrl}
            alt={logoAlt}
            width={80}
            height={40}
            loading="lazy"
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
  noscriptText,
  logoAlt,
}: {
  title: string;
  body: string;
  logoUrl: string | null;
  noscriptText: string;
  logoAlt: string;
}) {
  return (
    <PortalShell
      logoUrl={logoUrl}
      noscriptText={noscriptText}
      logoAlt={logoAlt}
    >
      <div className="mt-24 text-center">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        <p className="text-muted-foreground mt-2 text-sm">{body}</p>
      </div>
    </PortalShell>
  );
}

export default async function PortalPage({ params }: PortalPageProps) {
  const { token } = await params;
  const t = await getTranslations("Portal");
  const format = await getFormatter();

  const requestHeaders = await headers();
  const clientIp = getClientIp(requestHeaders);
  const [appearance, assessmentSettings] = await Promise.all([
    getAppearanceSettings(),
    getAssessmentSettings(),
  ]);
  const withinRateLimit = rateLimit(
    "portal-page",
    clientIp,
    assessmentSettings.portalPageLoadsPerMin,
  );

  const logoUrl = appearance.logoKey
    ? `/api/brand/logo?v=${appearance.logoKey}`
    : null;

  if (!withinRateLimit) {
    return (
      <PortalMessage
        title={t("linkNotFound")}
        body={t("linkInvalid")}
        logoUrl={logoUrl}
        noscriptText={t("noscript")}
        logoAlt={t("logoAlt")}
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
        title={t("linkNotFound")}
        body={t("linkInvalid")}
        logoUrl={logoUrl}
        noscriptText={t("noscript")}
        logoAlt={t("logoAlt")}
      />
    );
  }

  const isExpired = isTokenExpired(assessment.tokenExpiresAt);
  if (isExpired) {
    return (
      <PortalMessage
        title={t("linkExpiredTitle")}
        body={t("linkExpiredBody")}
        logoUrl={logoUrl}
        noscriptText={t("noscript")}
        logoAlt={t("logoAlt")}
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
      <PortalShell
        logoUrl={logoUrl}
        noscriptText={t("noscript")}
        logoAlt={t("logoAlt")}
      >
        <div className="flex flex-col gap-6">
          <header className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {t("submittedTitle", { title: assessment.title })}
              </h1>
              <p className="text-muted-foreground text-sm">
                {assessment.vendor.name}
              </p>
            </div>
          </header>
          <div className="rounded-md border border-[var(--success)] bg-[var(--success)]/10 px-4 py-3">
            <p className="text-sm font-medium">{t("submittedBanner")}</p>
            <p className="text-muted-foreground mt-1 text-xs">
              {t("submittedBody")}
            </p>
          </div>
          {assessment.questions.map((question) => {
            const response = responseMap.get(question.id);
            const review = response?.review;
            const questionComments = assessment.comments.filter(
              (comment) =>
                comment.assessmentQuestionId === question.id &&
                (comment.visibility === "VENDOR" ||
                  comment.authorType === "VENDOR"),
            );
            return (
              <div key={question.id} className="rounded-md border p-4">
                <p className="text-sm font-medium">{question.text}</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  {response?.isNotApplicable
                    ? t("notApplicableShort")
                    : response
                      ? String(response.value ?? "—")
                      : "—"}
                </p>
                {review ? (
                  <p className="text-muted-foreground mt-1 text-xs">
                    <span
                      className={
                        review.decision === "APPROVED"
                          ? "text-[var(--success)]"
                          : "text-muted-foreground"
                      }
                    >
                      {t.has(`decisions.${review.decision}`)
                        ? t(`decisions.${review.decision}`)
                        : review.decision}
                    </span>
                    {review.note && isNoteVisibleToVendor(review.decision)
                      ? ` — ${review.note}`
                      : ""}
                  </p>
                ) : null}
                {questionComments.length > 0 ? (
                  <div className="mt-3 flex flex-col gap-1.5 border-t pt-3">
                    {questionComments.map((comment) => (
                      <div
                        key={comment.id}
                        className="text-muted-foreground text-xs"
                      >
                        <span className="font-medium">
                          {comment.authorName}
                        </span>{" "}
                        ·{" "}
                        {format.dateTime(comment.createdAt, {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                        <p className="mt-0.5 text-sm">{comment.body}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </PortalShell>
    );
  }

  if (assessment.status !== "SENT" && assessment.status !== "IN_PROGRESS") {
    return (
      <PortalMessage
        title={t("notAvailableTitle")}
        body={t("notAvailableBody")}
        logoUrl={logoUrl}
        noscriptText={t("noscript")}
        logoAlt={t("logoAlt")}
      />
    );
  }

  if (assessment.portalPasswordHash) {
    const cookieStore = await cookies();
    const portalAuthCookie = cookieStore.get("portal-auth");
    // Compare against the keyed HMAC of the token (what the gate action
    // stores), in constant time. The raw token must NOT satisfy this check —
    // it is public, so echoing it would let link-holders skip the password.
    const expectedCookieValue = hashWithSecret(token);
    if (
      !portalAuthCookie ||
      !timingSafeEqualString(portalAuthCookie.value, expectedCookieValue)
    ) {
      return (
        <PortalShell
          logoUrl={logoUrl}
          noscriptText={t("noscript")}
          logoAlt={t("logoAlt")}
        >
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
      const decision = response.review.decision;
      reviewByQuestionId[response.assessmentQuestionId] = {
        decision,
        // Internal reviewer notes stay private; only clarification requests
        // are meant to be read by the vendor.
        note: isNoteVisibleToVendor(decision) ? response.review.note : null,
      };
    }
  }

  return (
    <PortalShell
      logoUrl={logoUrl}
      noscriptText={t("noscript")}
      logoAlt={t("logoAlt")}
    >
      {assessment.status === "IN_PROGRESS" ? (
        <div className="border-warning/50 bg-warning/10 rounded-md border px-4 py-3">
          <p className="text-sm font-medium">{t("additionalInfoTitle")}</p>
          <p className="text-muted-foreground mt-1 text-xs">
            {t("additionalInfoBody")}
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
          (comment) =>
            comment.visibility === "VENDOR" || comment.authorType === "VENDOR",
        )}
        maxUploadMb={fileSettings.maxUploadMb}
        allowedExtensions={fileSettings.allowedExtensions}
      />
    </PortalShell>
  );
}
