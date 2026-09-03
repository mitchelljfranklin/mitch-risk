"use client";

import { useActionState, useState } from "react";

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
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteTrustSectionAction,
  saveTrustSectionAction,
} from "@/lib/actions/trust-center";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { Trash2 } from "lucide-react";

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
  const [editing, setEditing] = useState<"new" | TrustSectionView | null>(null);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Custom sections</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setEditing("new")}>
            Add section
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {sections.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No custom sections. Add markdown blocks for an overview, FAQ or
            anything else the structured types do not cover.
          </p>
        ) : (
          <div className="flex flex-col divide-y rounded-lg border">
            {sections.map((section) => (
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
                        Draft
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
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditing(section)}
                  >
                    Edit
                  </Button>
                  <form action={deleteTrustSectionAction}>
                    <input type="hidden" name="id" value={section.id} />
                    <ConfirmDialog
                      title="Delete section?"
                      description={`"${section.title}" will be removed from the trust center.`}
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label={`Delete ${section.title}`}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </ConfirmDialog>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Sheet
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              {editing === "new" ? "Add section" : "Edit section"}
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
  const [state, formAction, isPending] = useActionState(
    saveTrustSectionAction,
    undefined,
  );
  useActionFeedback(state);

  return (
    <form action={formAction} className="mt-4 flex flex-col gap-4">
      {section ? <input type="hidden" name="id" value={section.id} /> : null}
      <div className="grid gap-2">
        <Label htmlFor="section-title">Title</Label>
        <Input
          id="section-title"
          name="title"
          defaultValue={section?.title ?? ""}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="section-body">Body (markdown)</Label>
        <Textarea
          id="section-body"
          name="body"
          rows={10}
          defaultValue={section?.body ?? ""}
          placeholder="Supports markdown formatting."
        />
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id="section-published"
          name="published"
          defaultChecked={section?.published ?? true}
        />
        <Label htmlFor="section-published">Published</Label>
      </div>
      <div className="flex items-center gap-2">
        <SubmitButton size="sm">
          {isPending ? "Saving..." : "Save"}
        </SubmitButton>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
