import { ragTextClass } from "@/lib/utils";

type ScoreBadgeProps = {
  score: number | null | undefined;
  size?: "sm" | "default" | "lg";
};

const SIZE_CLASSES = {
  sm: "text-xs px-1.5 py-0.5",
  default: "text-sm px-2 py-0.5",
  lg: "text-lg font-semibold px-2.5 py-1",
};

export function ScoreBadge({ score, size = "default" }: ScoreBadgeProps) {
  const display =
    score !== null && score !== undefined ? `${Math.round(score * 100)}%` : "—";

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${ragTextClass(score)} ${SIZE_CLASSES[size]}`}
    >
      {display}
    </span>
  );
}
