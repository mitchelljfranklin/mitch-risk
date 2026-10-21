"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActionFeedback } from "@/hooks/use-action-feedback";
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
  logoKey: string;
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
  const translations = useTranslations("Admin.appearance");
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
          onChange={(event) => setColor(event.target.value)}
          className="h-9 w-14 cursor-pointer rounded border p-1"
        />
        <Input
          id={name}
          name={name}
          value={color}
          onChange={(event) => setColor(event.target.value)}
          className="w-32 font-mono"
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setColor(defaultHex)}
        >
          {translations("reset")}
        </Button>
      </div>
    </div>
  );
}

export function AppearanceForm({
  primaryHex,
  secondaryHex,
  hasLogo,
  logoKey,
  ragGreenHex,
  ragAmberHex,
  ragRedHex,
  ragUnscoredHex,
  borderRadius,
  pageWidth,
}: AppearanceFormProps) {
  const translations = useTranslations("Admin.appearance");
  const [state, action, isPending] = useActionState(
    saveAppearanceSettings,
    undefined,
  );

  useActionFeedback(state);

  return (
    <form id="appearance-form" action={action} className="grid gap-6">
      <input
        id="removeLogoInput"
        name="removeLogo"
        type="hidden"
        value="false"
      />
      <div className="grid gap-2">
        <Label htmlFor="logoFile">{translations("logo")}</Label>
        <Input
          id="logoFile"
          name="logoFile"
          type="file"
          accept="image/*"
          className="cursor-pointer"
        />
        {state && !state.ok ? (
          <p className="text-destructive text-xs" role="alert">
            {state.message}
          </p>
        ) : null}
        {hasLogo ? (
          <div className="flex flex-col gap-2">
            <img
              src={`/api/brand/logo?v=${logoKey}`}
              alt={translations("currentLogoAlt")}
              width={48}
              height={48}
              className="h-12 w-auto rounded-md border object-contain"
            />
            <ConfirmDialog
              title={translations("removeLogoTitle")}
              description={translations("removeLogoDescription")}
              confirmLabel={translations("remove")}
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
                {translations("removeLogo")}
              </Button>
            </ConfirmDialog>
          </div>
        ) : (
          <p className="text-muted-foreground text-xs">
            {translations("noLogo")}
          </p>
        )}
      </div>

      <ColorField
        label={translations("primaryColour")}
        description={translations("primaryColourHint")}
        hexValue={primaryHex}
        defaultHex="#0a0a0a"
        name="primaryHex"
      />

      <ColorField
        label={translations("secondaryColour")}
        description={translations("secondaryColourHint")}
        hexValue={secondaryHex}
        defaultHex="#f5f5f5"
        name="secondaryHex"
      />

      <div className="border-t pt-6">
        <p className="text-sm font-medium">{translations("ragTitle")}</p>
        <p className="text-muted-foreground text-xs">
          {translations("ragHint")}
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <ColorField
          label={translations("ragGreen")}
          description={translations("ragGreenHint")}
          hexValue={ragGreenHex}
          defaultHex="#16a34a"
          name="ragGreenHex"
        />
        <ColorField
          label={translations("ragAmber")}
          description={translations("ragAmberHint")}
          hexValue={ragAmberHex}
          defaultHex="#d97706"
          name="ragAmberHex"
        />
        <ColorField
          label={translations("ragRed")}
          description={translations("ragRedHint")}
          hexValue={ragRedHex}
          defaultHex="#dc2626"
          name="ragRedHex"
        />
        <ColorField
          label={translations("ragUnscored")}
          description={translations("ragUnscoredHint")}
          hexValue={ragUnscoredHex}
          defaultHex="#9ca3af"
          name="ragUnscoredHex"
        />
      </div>

      <div className="border-t pt-6">
        <p className="text-sm font-medium">{translations("layoutTitle")}</p>
        <p className="text-muted-foreground text-xs">
          {translations("layoutHint")}
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="borderRadius">{translations("borderRadius")}</Label>
          <p className="text-muted-foreground text-xs">
            {translations("borderRadiusHint")}
          </p>
          <Input
            id="borderRadius"
            name="borderRadius"
            type="number"
            min={0}
            max={16}
            key={borderRadius}
            defaultValue={borderRadius}
            className="w-32"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="pageWidth">{translations("pageWidth")}</Label>
          <p className="text-muted-foreground text-xs">
            {translations("pageWidthHint")}
          </p>
          <Select name="pageWidth" defaultValue={pageWidth} key={pageWidth}>
            <SelectTrigger id="pageWidth" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="constrained">
                {translations("constrained")}
              </SelectItem>
              <SelectItem value="full">{translations("full")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending} size="sm">
          {isPending ? translations("saving") : translations("save")}
        </Button>
      </div>
    </form>
  );
}
