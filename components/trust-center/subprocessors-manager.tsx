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
  deleteTrustSubprocessorAction,
  saveTrustSubprocessorAction,
} from "@/lib/actions/trust-center";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { Trash2 } from "lucide-react";

export type TrustSubprocessorView = {
  id: string;
  name: string;
  purpose: string;
  location: string;
  websiteUrl: string;
  published: boolean;
};

type SubprocessorsManagerProps = {
  subprocessors: TrustSubprocessorView[];
};

export function SubprocessorsManager({
  subprocessors,
}: SubprocessorsManagerProps) {
  const [editing, setEditing] = useState<"new" | TrustSubprocessorView | null>(
    null,
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Subprocessors</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setEditing("new")}>
            Add subprocessor
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {subprocessors.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No subprocessors configured. List third parties that process data on
            your behalf.
          </p>
        ) : (
          <div className="flex flex-col divide-y rounded-lg border">
            {subprocessors.map((subprocessor) => (
              <div
                key={subprocessor.id}
                className="flex items-start justify-between gap-2 p-3"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">
                      {subprocessor.name}
                    </span>
                    {subprocessor.published ? null : (
                      <Badge variant="secondary" className="text-xs">
                        Draft
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
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditing(subprocessor)}
                  >
                    Edit
                  </Button>
                  <form
                    id={`delete-trust-subprocessor-${subprocessor.id}`}
                    action={deleteTrustSubprocessorAction}
                  >
                    <input type="hidden" name="id" value={subprocessor.id} />
                    <ConfirmDialog
                      title="Delete subprocessor?"
                      description={`"${subprocessor.name}" will be removed from the trust center.`}
                      formId={`delete-trust-subprocessor-${subprocessor.id}`}
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label={`Delete ${subprocessor.name}`}
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
              {editing === "new" ? "Add subprocessor" : "Edit subprocessor"}
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
  const [state, formAction, isPending] = useActionState(
    saveTrustSubprocessorAction,
    undefined,
  );
  useActionFeedback(state);

  return (
    <form action={formAction} className="mt-4 flex flex-col gap-4">
      {subprocessor ? (
        <input type="hidden" name="id" value={subprocessor.id} />
      ) : null}
      <div className="grid gap-2">
        <Label htmlFor="subprocessor-name">Name</Label>
        <Input
          id="subprocessor-name"
          name="name"
          defaultValue={subprocessor?.name ?? ""}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="subprocessor-purpose">Purpose</Label>
        <Textarea
          id="subprocessor-purpose"
          name="purpose"
          rows={2}
          defaultValue={subprocessor?.purpose ?? ""}
          placeholder="e.g. Cloud hosting of application data"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="subprocessor-location">Data location</Label>
        <Input
          id="subprocessor-location"
          name="location"
          defaultValue={subprocessor?.location ?? ""}
          placeholder="e.g. Australia (Sydney)"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="subprocessor-websiteUrl">Website</Label>
        <Input
          id="subprocessor-websiteUrl"
          name="websiteUrl"
          type="url"
          defaultValue={subprocessor?.websiteUrl ?? ""}
          placeholder="https://…"
        />
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id="subprocessor-published"
          name="published"
          defaultChecked={subprocessor?.published ?? true}
        />
        <Label htmlFor="subprocessor-published">Published</Label>
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
