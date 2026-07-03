"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFormToast } from "@/hooks/use-form-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveAppearanceSettings } from "./actions";

type AppearanceFormProps = {
  primaryHex: string;
  secondaryHex: string;
  hasLogo: boolean;
  ragGreenHex: string;
  ragAmberHex: string;
  ragRedHex: string;
  ragUnscoredHex: string;
  borderRadius: number;
  pageWidth: string;
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
  borderRadius,
  pageWidth,
}: AppearanceFormProps) {
  const [state, action, isPending] = useActionState(
    saveAppearanceSettings,
    undefined,
  );

  useFormToast(state);

  return (
    <form id="appearance-form" action={action} className="grid gap-6">
      <input
        id="removeLogoInput"
        name="removeLogo"
        type="hidden"
        value="false"
      />
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
              width={48}
              height={48}
              className="h-12 w-auto rounded-md border object-contain"
            />
            <ConfirmDialog
              title="Remove logo?"
              description="The current logo will be removed from all pages. You can upload a new logo at any time."
              confirmLabel="Remove"
              formId="appearance-form"
            >
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive w-fit"
                onClick={() => {
                  const input = document.getElementById(
                    "removeLogoInput",
                  ) as HTMLInputElement | null;
                  if (input) input.value = "true";
                }}
              >
                Remove logo
              </Button>
            </ConfirmDialog>
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
          Used for score indicators, progress bars, and the vendor risk heatmap.
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

      <div className="border-t pt-6">
        <p className="text-sm font-medium">Layout</p>
        <p className="text-muted-foreground text-xs">
          Adjust the overall look and feel of the platform.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="borderRadius">Border radius (px)</Label>
          <p className="text-muted-foreground text-xs">
            Controls how rounded corners are across the app.
          </p>
          <Input
            id="borderRadius"
            name="borderRadius"
            type="number"
            min={0}
            max={16}
            defaultValue={borderRadius}
            className="w-32"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="pageWidth">Page width</Label>
          <p className="text-muted-foreground text-xs">
            Constrain content to a readable width or use the full screen.
          </p>
          <Select name="pageWidth" defaultValue={pageWidth}>
            <SelectTrigger id="pageWidth" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="constrained">Constrained</SelectItem>
              <SelectItem value="full">Full width</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending} size="sm">
          {isPending ? "Saving..." : "Save appearance"}
        </Button>
      </div>
    </form>
  );
}
