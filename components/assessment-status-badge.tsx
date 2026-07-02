import {
  ASSESSMENT_STATUS_LABELS,
  ASSESSMENT_STATUS_STYLES,
} from "@/lib/schemas/assessment";
import { cn } from "@/lib/utils";

export function AssessmentStatusBadge({ status }: { status: string }) {
  const label = ASSESSMENT_STATUS_LABELS[status] ?? status;
  const style =
    ASSESSMENT_STATUS_STYLES[status] ?? "bg-muted text-muted-foreground";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        style,
      )}
    >
      {label}
    </span>
  );
}
