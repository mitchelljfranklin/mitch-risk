"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveAppearanceSettings } from "./actions";

type AppearanceFormProps = {
  primaryHex: string;
  secondaryHex: string;
  hasLogo: boolean;
};

export function AppearanceForm({
  primaryHex,
  secondaryHex,
  hasLogo,
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

      <div className="grid gap-2">
        <Label htmlFor="primaryHexColor">Primary colour</Label>
        <p className="text-muted-foreground text-xs">
          Used for main buttons, links, and active states.
        </p>
        <div className="flex items-center gap-3">
          <input
            id="primaryHexColor"
            type="color"
            defaultValue={primaryHex || "#0a0a0a"}
            className="h-9 w-14 cursor-pointer rounded border p-1"
            onChange={(e) => {
              const hex = document.getElementById(
                "primaryHex",
              ) as HTMLInputElement | null;
              if (hex) hex.value = e.target.value;
            }}
          />
          <Input
            id="primaryHex"
            name="primaryHex"
            placeholder="#3b82f6"
            defaultValue={primaryHex}
            className="w-32 font-mono"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              const hex = document.getElementById(
                "primaryHex",
              ) as HTMLInputElement | null;
              const color = document.getElementById(
                "primaryHexColor",
              ) as HTMLInputElement | null;
              if (hex) hex.value = "";
              if (color) color.value = "#000000";
            }}
          >
            Reset
          </Button>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="secondaryHexColor">Secondary colour</Label>
        <p className="text-muted-foreground text-xs">
          Used for tags, pills, badges, and secondary elements.
        </p>
        <div className="flex items-center gap-3">
          <input
            id="secondaryHexColor"
            type="color"
            defaultValue={secondaryHex || "#f5f5f5"}
            className="h-9 w-14 cursor-pointer rounded border p-1"
            onChange={(e) => {
              const hex = document.getElementById(
                "secondaryHex",
              ) as HTMLInputElement | null;
              if (hex) hex.value = e.target.value;
            }}
          />
          <Input
            id="secondaryHex"
            name="secondaryHex"
            placeholder="#f59e0b"
            defaultValue={secondaryHex}
            className="w-32 font-mono"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              const hex = document.getElementById(
                "secondaryHex",
              ) as HTMLInputElement | null;
              const color = document.getElementById(
                "secondaryHexColor",
              ) as HTMLInputElement | null;
              if (hex) hex.value = "";
              if (color) color.value = "#000000";
            }}
          >
            Reset
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Save appearance"}
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
