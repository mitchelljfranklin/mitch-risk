"use client";

import { useEffect, useActionState, useState } from "react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteTrustSubprocessorAction,
  moveTrustSubprocessorAction,
  saveTrustSubprocessorAction,
} from "@/lib/actions/trust-center";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";

export type TrustSubprocessorView = {
  id: string;
  name: string;
  purpose: string;
  location: string;
  websiteUrl: string;
  logoKey: string;
  published: boolean;
};

type SubprocessorsManagerProps = {
  subprocessors: TrustSubprocessorView[];
};

export function SubprocessorsManager({
  subprocessors,
}: SubprocessorsManagerProps) {
  const translations = useTranslations("TrustCenterManager.subprocessors");
  const commonTranslations = useTranslations("TrustCenterManager.common");
  const [editing, setEditing] = useState<"new" | TrustSubprocessorView | null>(
    null,
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">
            {translations("cardTitle")}
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setEditing("new")}>
            {translations("add")}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {subprocessors.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {translations("empty")}
          </p>
        ) : (
          <div className="flex flex-col divide-y rounded-lg border">
            {subprocessors.map((subprocessor, index) => {
              const isFirst = index === 0;
              const isLast = index === subprocessors.length - 1;
              return (
                <div
                  key={subprocessor.id}
                  className="flex items-start justify-between gap-2 p-3"
                >
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex items-center gap-2">
                      {subprocessor.logoKey ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`/api/trust/subprocessors/${subprocessor.id}/image?v=${subprocessor.logoKey}`}
                          alt=""
                          className="size-6 shrink-0 object-contain"
                        />
                      ) : null}
                      <span className="truncate text-sm font-medium">
                        {subprocessor.name}
                      </span>
                      {subprocessor.published ? null : (
                        <Badge variant="secondary" className="text-xs">
                          {commonTranslations("draft")}
                        </Badge>
                      )}
                    </div>
                    {subprocessor.purpose ? (
                      <p className="text-muted-foreground truncate text-xs">
                        {subprocessor.purpose}
                      </p>
                    ) : null}
                    {subprocessor.location ? (
                      <p className="text-muted-foreground text-xs">
                        {subprocessor.location}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <form
                      action={moveTrustSubprocessorAction}
                      className="flex flex-col"
                    >
                      <input type="hidden" name="id" value={subprocessor.id} />
                      <Button
                        type="submit"
                        name="direction"
                        value="up"
                        variant="ghost"
                        size="sm"
                        className="h-5 w-6 p-0"
                        disabled={isFirst}
                        aria-label={commonTranslations("moveUp", {
                          name: subprocessor.name,
                        })}
                      >
                        <ChevronUp className="size-3.5" />
                      </Button>
                      <Button
                        type="submit"
                        name="direction"
                        value="down"
                        variant="ghost"
                        size="sm"
                        className="h-5 w-6 p-0"
                        disabled={isLast}
                        aria-label={commonTranslations("moveDown", {
                          name: subprocessor.name,
                        })}
                      >
                        <ChevronDown className="size-3.5" />
                      </Button>
                    </form>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditing(subprocessor)}
                    >
                      {commonTranslations("edit")}
                    </Button>
                    <form
                      id={`delete-trust-subprocessor-${subprocessor.id}`}
                      action={deleteTrustSubprocessorAction}
                    >
                      <input type="hidden" name="id" value={subprocessor.id} />
                      <ConfirmDialog
                        title={translations("deleteTitle")}
                        description={translations("deleteDescription", {
                          name: subprocessor.name,
                        })}
                        formId={`delete-trust-subprocessor-${subprocessor.id}`}
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label={commonTranslations("deleteNamed", {
                            name: subprocessor.name,
                          })}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </ConfirmDialog>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Sheet
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>
              {editing === "new"
                ? translations("addTitle")
                : translations("editTitle")}
            </SheetTitle>
          </SheetHeader>
          {editing !== null ? (
            <SubprocessorEditor
              key={editing === "new" ? "new" : editing.id}
              subprocessor={editing === "new" ? null : editing}
              onDone={() => setEditing(null)}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </Card>
  );
}

function SubprocessorEditor({
  subprocessor,
  onDone,
}: {
  subprocessor: TrustSubprocessorView | null;
  onDone: () => void;
}) {
  const translations = useTranslations("TrustCenterManager.subprocessors");
  const commonTranslations = useTranslations("TrustCenterManager.common");
  const [state, formAction, isPending] = useActionState(
    saveTrustSubprocessorAction,
    undefined,
  );
  useActionFeedback(state);

  useEffect(() => {
    if (state?.ok) {
      onDone();
    }
  }, [state, onDone]);

  const isNew = subprocessor === null;

  return (
    <SheetContent className="w-full overflow-y-auto sm:max-w-md">
      <SheetHeader>
        <SheetTitle>
          {isNew ? translations("addTitle") : translations("editTitle")}
        </SheetTitle>
        <SheetDescription>{translations("editorDescription")}</SheetDescription>
      </SheetHeader>
      <form
        id="trust-subprocessor-form"
        action={formAction}
        className="flex flex-1 flex-col gap-4 px-4"
      >
        {subprocessor ? (
          <input type="hidden" name="id" value={subprocessor.id} />
        ) : null}
        <div className="grid gap-2">
          <Label htmlFor="subprocessor-name">{translations("name")}</Label>
          <Input
            id="subprocessor-name"
            name="name"
            defaultValue={subprocessor?.name ?? ""}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="subprocessor-purpose">
            {translations("purpose")}
          </Label>
          <Textarea
            id="subprocessor-purpose"
            name="purpose"
            rows={2}
            defaultValue={subprocessor?.purpose ?? ""}
            placeholder={translations("purposePlaceholder")}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="subprocessor-location">
            {translations("location")}
          </Label>
          <Input
            id="subprocessor-location"
            name="location"
            defaultValue={subprocessor?.location ?? ""}
            placeholder={translations("locationPlaceholder")}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="subprocessor-websiteUrl">
            {translations("website")}
          </Label>
          <Input
            id="subprocessor-websiteUrl"
            name="websiteUrl"
            type="url"
            defaultValue={subprocessor?.websiteUrl ?? ""}
            placeholder="https://…"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="subprocessor-logoFile">{translations("logo")}</Label>
          <Input
            id="subprocessor-logoFile"
            name="logoFile"
            type="file"
            accept=".png,.jpg,.jpeg,.gif,.webp"
          />
          <p className="text-muted-foreground text-xs">
            {translations("logoHint")}
            {subprocessor?.logoKey ? translations("logoHintKeep") : ""}
          </p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="subprocessor-logoUrl">
            {translations("logoUrl")}
          </Label>
          <Input
            id="subprocessor-logoUrl"
            name="logoUrl"
            type="url"
            placeholder={translations("logoUrlPlaceholder")}
          />
          <p className="text-muted-foreground text-xs">
            {translations("logoUrlHint")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="subprocessor-published"
            name="published"
            defaultChecked={subprocessor?.published ?? true}
          />
          <Label htmlFor="subprocessor-published">
            {commonTranslations("published")}
          </Label>
        </div>
      </form>
      <SheetFooter className="px-4">
        <Button
          type="submit"
          form="trust-subprocessor-form"
          disabled={isPending}
        >
          {isPending ? commonTranslations("saving") : translations("save")}
        </Button>
        <Button type="button" variant="outline" onClick={onDone}>
          {commonTranslations("cancel")}
        </Button>
      </SheetFooter>
    </SheetContent>
  );
}
