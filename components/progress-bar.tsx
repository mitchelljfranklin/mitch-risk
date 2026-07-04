import { cn } from "@/lib/utils";

type ProgressBarProps = {
  value: number;
  className?: string;
};

export function ProgressBar({ value, className }: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value));
  return (
    <div className="bg-muted h-2 w-full rounded-full">
      <div
        className={cn("h-full rounded-full transition-all", className)}
        style={{ width: `${Math.round(clampedValue)}%` }}
      />
    </div>
  );
}
