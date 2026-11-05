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
  deleteTrustSectionAction,
  moveTrustSectionAction,
  saveTrustSectionAction,
} from "@/lib/actions/trust-center";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";

export type TrustSectionView = {
  id: string;
  title: string;
  body: string;
  published: boolean;
};

type SectionsManagerProps = {
  sections: TrustSectionView[];
};

export function SectionsManager({ sections }: SectionsManagerProps) {
  const translations = useTranslations("TrustCenterManager.sections");
  const commonTranslations = useTranslations("TrustCenterManager.common");
  const [editing, setEditing] = useState<"new" | TrustSectionView | null>(null);

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
        {sections.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {translations("empty")}
          </p>
        ) : (
          <div className="flex flex-col divide-y rounded-lg border">
            {sections.map((section, index) => {
              const isFirst = index === 0;
              const isLast = index === sections.length - 1;
              return (
                <div
                  key={section.id}
                  className="flex items-start justify-between gap-2 p-3"
                >
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">
                        {section.title}
                      </span>
                      {section.published ? null : (
                        <Badge variant="secondary" className="text-xs">
                          {commonTranslations("draft")}
                        </Badge>
                      )}
                    </div>
                    {section.body ? (
                      <p className="text-muted-foreground truncate text-xs">
                        {section.body.slice(0, 120)}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <form
                      action={moveTrustSectionAction}
                      className="flex flex-col"
                    >
                      <input type="hidden" name="id" value={section.id} />
                      <Button
                        type="submit"
                        name="direction"
                        value="up"
                        variant="ghost"
                        size="sm"
                        className="h-5 w-6 p-0"
                        disabled={isFirst}
                        aria-label={commonTranslations("moveUp", {
                          name: section.title,
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
                          name: section.title,
                        })}
                      >
                        <ChevronDown className="size-3.5" />
                      </Button>
                    </form>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditing(section)}
                    >
                      {commonTranslations("edit")}
                    </Button>
                    <form
                      id={`delete-trust-section-${section.id}`}
                      action={deleteTrustSectionAction}
                    >
                      <input type="hidden" name="id" value={section.id} />
                      <ConfirmDialog
                        title={translations("deleteTitle")}
                        description={translations("deleteDescription", {
                          name: section.title,
                        })}
                        formId={`delete-trust-section-${section.id}`}
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label={commonTranslations("deleteNamed", {
                            name: section.title,
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
            <SectionEditor
              key={editing === "new" ? "new" : editing.id}
              section={editing === "new" ? null : editing}
              onDone={() => setEditing(null)}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </Card>
  );
}

function SectionEditor({
  section,
  onDone,
}: {
  section: TrustSectionView | null;
  onDone: () => void;
}) {
  const translations = useTranslations("TrustCenterManager.sections");
  const commonTranslations = useTranslations("TrustCenterManager.common");
  const [state, formAction, isPending] = useActionState(
    saveTrustSectionAction,
    undefined,
  );
  useActionFeedback(state);

  useEffect(() => {
    if (state?.ok) {
      onDone();
    }
  }, [state, onDone]);

  const isNew = section === null;

  return (
    <SheetContent className="w-full overflow-y-auto sm:max-w-md">
      <SheetHeader>
        <SheetTitle>
          {isNew ? translations("addTitle") : translations("editTitle")}
        </SheetTitle>
        <SheetDescription>{translations("editorDescription")}</SheetDescription>
      </SheetHeader>
      <form
        id="trust-section-form"
        action={formAction}
        className="flex flex-1 flex-col gap-4 px-4"
      >
        {section ? <input type="hidden" name="id" value={section.id} /> : null}
        <div className="grid gap-2">
          <Label htmlFor="section-title">{translations("titleLabel")}</Label>
          <Input
            id="section-title"
            name="title"
            defaultValue={section?.title ?? ""}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="section-body">{translations("body")}</Label>
          <Textarea
            id="section-body"
            name="body"
            rows={10}
            defaultValue={section?.body ?? ""}
            placeholder={translations("bodyPlaceholder")}
          />
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="section-published"
            name="published"
            defaultChecked={section?.published ?? true}
          />
          <Label htmlFor="section-published">
            {commonTranslations("published")}
          </Label>
        </div>
      </form>
      <SheetFooter className="px-4">
        <Button type="submit" form="trust-section-form" disabled={isPending}>
          {isPending ? commonTranslations("saving") : translations("save")}
        </Button>
        <Button type="button" variant="outline" onClick={onDone}>
          {commonTranslations("cancel")}
        </Button>
      </SheetFooter>
    </SheetContent>
  );
}
