"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveAppearanceSettings } from "./actions";

type AppearanceFormProps = {
  primaryHex: string;
  secondaryHex: string;
  hasLogo: boolean;
  ragGreenHex: string;
  ragAmberHex: string;
  ragRedHex: string;
  ragUnscoredHex: string;
};

function ColorField({
  label,
  description,
  hexValue,
  defaultHex,
  name,
}: {
  label: string;
  description: string;
  hexValue: string;
  defaultHex: string;
  name: string;
}) {
  const [color, setColor] = useState(hexValue || defaultHex);

  return (
    <div className="grid gap-2">
      <Label htmlFor={`${name}Color`}>{label}</Label>
      <p className="text-muted-foreground text-xs">{description}</p>
      <div className="flex items-center gap-3">
        <input
          id={`${name}Color`}
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="h-9 w-14 cursor-pointer rounded border p-1"
        />
        <Input
          id={name}
          name={name}
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="w-32 font-mono"
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setColor(defaultHex)}
        >
          Reset
        </Button>
      </div>
    </div>
  );
}

export function AppearanceForm({
  primaryHex,
  secondaryHex,
  hasLogo,
  ragGreenHex,
  ragAmberHex,
  ragRedHex,
  ragUnscoredHex,
}: AppearanceFormProps) {
  const [state, action, isPending] = useActionState(
    saveAppearanceSettings,
    undefined,
  );

  return (
    <form action={action} className="grid gap-6">
      <div className="grid gap-2">
        <Label htmlFor="logoFile">Logo</Label>
        <Input
          id="logoFile"
          name="logoFile"
          type="file"
          accept="image/*"
          className="cursor-pointer"
        />
        {hasLogo ? (
          <div className="flex flex-col gap-2">
            <img
              src="/api/brand/logo"
              alt="Current logo"
              className="h-12 w-auto rounded-md border object-contain"
            />
            <Button
              type="submit"
              name="removeLogo"
              value="true"
              variant="ghost"
              size="sm"
              className="text-destructive w-fit"
            >
              Remove logo
            </Button>
          </div>
        ) : (
          <p className="text-muted-foreground text-xs">
            No logo uploaded. Upload a PNG or JPG (max 2 MB).
          </p>
        )}
      </div>

      <ColorField
        label="Primary colour"
        description="Used for main buttons, links, and active states."
        hexValue={primaryHex}
        defaultHex="#0a0a0a"
        name="primaryHex"
      />

      <ColorField
        label="Secondary colour"
        description="Used for tags, pills, badges, and secondary elements."
        hexValue={secondaryHex}
        defaultHex="#f5f5f5"
        name="secondaryHex"
      />

      <div className="border-t pt-6">
        <p className="text-sm font-medium">RAG indicator colours</p>
        <p className="text-muted-foreground text-xs">
          Used for score indicators, progress bars, and the vendor risk
          heatmap.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <ColorField
          label="Green (compliant)"
          description="Score ≥ 85%"
          hexValue={ragGreenHex}
          defaultHex="#16a34a"
          name="ragGreenHex"
        />
        <ColorField
          label="Amber (needs attention)"
          description="Score 60–84%"
          hexValue={ragAmberHex}
          defaultHex="#d97706"
          name="ragAmberHex"
        />
        <ColorField
          label="Red (deficient)"
          description="Score &lt; 60%"
          hexValue={ragRedHex}
          defaultHex="#dc2626"
          name="ragRedHex"
        />
        <ColorField
          label="Unscored (neutral)"
          description="Not yet assessed"
          hexValue={ragUnscoredHex}
          defaultHex="#9ca3af"
          name="ragUnscoredHex"
        />
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending} size="sm">
          {isPending ? "Saving..." : "Save appearance"}
        </Button>
        {state?.message ? (
          <p
            className={`text-sm ${state.ok ? "text-green-600" : "text-destructive"}`}
            role="alert"
          >
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
