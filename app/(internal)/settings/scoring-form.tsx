"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { type SettingsActionState, saveScoringSettings } from "./actions";
import { useFormToast } from "@/hooks/use-form-toast";

type ScoringFormProps = {
  riskWeightCritical: number;
  riskWeightHigh: number;
  riskWeightMedium: number;
  riskWeightLow: number;
  ragAmber: number;
  ragGreen: number;
};

const initialState: SettingsActionState = undefined;

export function ScoringForm({
  riskWeightCritical,
  riskWeightHigh,
  riskWeightMedium,
  riskWeightLow,
  ragAmber,
  ragGreen,
}: ScoringFormProps) {
  const [state, formAction, isPending] = useActionState(
    saveScoringSettings,
    initialState,
  );
  useFormToast(state);

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-2">
        <Label className="text-sm font-medium">Risk weights (numeric)</Label>
        <div className="grid grid-cols-4 gap-2">
          {(
            [
              ["CRITICAL", "criticalWeight", riskWeightCritical],
              ["HIGH", "highWeight", riskWeightHigh],
              ["MEDIUM", "mediumWeight", riskWeightMedium],
              ["LOW", "lowWeight", riskWeightLow],
            ] as const
          ).map(([label, name, value]) => (
            <div key={name} className="grid gap-1">
              <Label htmlFor={name} className="text-xs">
                {label}
              </Label>
              <Input
                id={name}
                name={name}
                type="number"
                min={0}
                defaultValue={String(value)}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-2">
        <Label className="text-sm font-medium">RAG thresholds</Label>
        <p className="text-muted-foreground text-xs">
          Green at or above, amber at or above, red below.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-1">
            <Label htmlFor="ragGreen" className="text-xs">
              Green ≥
            </Label>
            <Input
              id="ragGreen"
              name="ragGreen"
              type="number"
              min={0}
              max={1}
              step={0.01}
              defaultValue={String(ragGreen)}
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="ragAmber" className="text-xs">
              Amber ≥
            </Label>
            <Input
              id="ragAmber"
              name="ragAmber"
              type="number"
              min={0}
              max={1}
              step={0.01}
              defaultValue={String(ragAmber)}
            />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending} size="sm">
          {isPending ? "Saving..." : "Save scoring"}
        </Button>
      </div>
    </form>
  );
}
