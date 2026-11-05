"use client";

import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateFindingStatusAction } from "@/lib/actions/findings";
import { FINDING_STATUSES } from "@/lib/schemas/assessment";

type FindingStatusFormProps = {
  findingId: string;
  assessmentId: string;
  currentStatus: string;
  currentNote: string;
};

export function FindingStatusForm({
  findingId,
  assessmentId,
  currentStatus,
  currentNote,
}: FindingStatusFormProps) {
  const translations = useTranslations("Assessments.detail.findingStatus");
  const commonTranslations = useTranslations("Common");

  return (
    <form
      action={updateFindingStatusAction}
      className="mt-2 flex flex-wrap items-center gap-2"
    >
      <input type="hidden" name="findingId" value={findingId} />
      <input type="hidden" name="assessmentId" value={assessmentId} />
      <Select key={currentStatus} name="status" defaultValue={currentStatus}>
        <SelectTrigger className="h-8 w-40 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FINDING_STATUSES.map((status) => (
            <SelectItem key={status} value={status}>
              {commonTranslations.has(`findingStatuses.${status}`)
                ? commonTranslations(`findingStatuses.${status}`)
                : status}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        name="resolutionNote"
        defaultValue={currentNote}
        placeholder={translations("resolutionNotePlaceholder")}
        className="h-8 flex-1 text-xs"
      />
      <SubmitButton type="submit" size="sm" variant="secondary">
        {translations("save")}
      </SubmitButton>
    </form>
  );
}
