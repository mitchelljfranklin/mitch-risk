"use client";

import { useEffect, useActionState, useState } from "react";

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
  deleteTrustBadgeAction,
  moveTrustBadgeAction,
  saveTrustBadgeAction,
} from "@/lib/actions/trust-center";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { BadgeCheck, ChevronDown, ChevronUp, Trash2 } from "lucide-react";

export type TrustBadgeView = {
  id: string;
  title: string;
  issuer: string;
  description: string;
  externalUrl: string;
  imageKey: string;
  published: boolean;
};

type BadgesManagerProps = {
  badges: TrustBadgeView[];
};

export function BadgesManager({ badges }: BadgesManagerProps) {
  const [editing, setEditing] = useState<"new" | TrustBadgeView | null>(null);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Compliance badges</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setEditing("new")}>
            Add badge
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {badges.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No badges configured. Add certifications like SOC 2 or ISO 27001 to
            display them on the public page.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {badges.map((badge, index) => {
              const isFirst = index === 0;
              const isLast = index === badges.length - 1;
              return (
                <div
                  key={badge.id}
                  className="flex items-start justify-between gap-2 rounded-md border p-3"
                >
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <BadgeCheck className="text-muted-foreground size-4" />
                      <span className="truncate text-sm font-medium">
                        {badge.title}
                      </span>
                      {badge.published ? null : (
                        <Badge variant="secondary" className="text-xs">
                          Draft
                        </Badge>
                      )}
                    </div>
                    {badge.issuer ? (
                      <p className="text-muted-foreground truncate text-xs">
                        {badge.issuer}
                      </p>
                    ) : null}
                    {badge.externalUrl ? (
                      <a
                        href={badge.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs underline"
                      >
                        Verification link
                      </a>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <form
                      action={moveTrustBadgeAction}
                      className="flex flex-col"
                    >
                      <input type="hidden" name="id" value={badge.id} />
                      <Button
                        type="submit"
                        name="direction"
                        value="up"
                        variant="ghost"
                        size="sm"
                        className="h-5 w-6 p-0"
                        disabled={isFirst}
                        aria-label={`Move ${badge.title} up`}
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
                        aria-label={`Move ${badge.title} down`}
                      >
                        <ChevronDown className="size-3.5" />
                      </Button>
                    </form>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditing(badge)}
                    >
                      Edit
                    </Button>
                    <form
                      id={`delete-trust-badge-${badge.id}`}
                      action={deleteTrustBadgeAction}
                    >
                      <input type="hidden" name="id" value={badge.id} />
                      <ConfirmDialog
                        title="Delete badge?"
                        description={`The "${badge.title}" badge will be removed from the trust center.`}
                        formId={`delete-trust-badge-${badge.id}`}
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label={`Delete ${badge.title}`}
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
              {editing === "new" ? "Add badge" : "Edit badge"}
            </SheetTitle>
          </SheetHeader>
          {editing !== null ? (
            <BadgeEditor
              key={editing === "new" ? "new" : editing.id}
              badge={editing === "new" ? null : editing}
              onDone={() => setEditing(null)}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </Card>
  );
}

function BadgeEditor({
  badge,
  onDone,
}: {
  badge: TrustBadgeView | null;
  onDone: () => void;
}) {
  const [state, formAction, isPending] = useActionState(
    saveTrustBadgeAction,
    undefined,
  );
  useActionFeedback(state);

  useEffect(() => {
    if (state?.ok) {
      onDone();
    }
  }, [state, onDone]);

  const isNew = badge === null;

  return (
    <SheetContent className="w-full overflow-y-auto sm:max-w-md">
      <SheetHeader>
        <SheetTitle>{isNew ? "Add badge" : "Edit badge"}</SheetTitle>
        <SheetDescription>
          Shown as a certification tile on the public trust center page.
        </SheetDescription>
      </SheetHeader>
      <form
        id="trust-badge-form"
        action={formAction}
        className="flex flex-1 flex-col gap-4 px-4"
      >
        {badge ? <input type="hidden" name="id" value={badge.id} /> : null}
        <div className="grid gap-2">
          <Label htmlFor="badge-title">Title</Label>
          <Input
            id="badge-title"
            name="title"
            defaultValue={badge?.title ?? ""}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="badge-issuer">Issuer</Label>
          <Input
            id="badge-issuer"
            name="issuer"
            defaultValue={badge?.issuer ?? ""}
            placeholder="e.g. AICPA, BSI"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="badge-description">Description</Label>
          <Textarea
            id="badge-description"
            name="description"
            rows={2}
            defaultValue={badge?.description ?? ""}
            placeholder="e.g. SOC 2 Type II audited annually"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="badge-externalUrl">Verification URL</Label>
          <Input
            id="badge-externalUrl"
            name="externalUrl"
            type="url"
            defaultValue={badge?.externalUrl ?? ""}
            placeholder="https://…"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="badge-image">Badge image</Label>
          <Input
            id="badge-image"
            name="imageFile"
            type="file"
            accept=".png,.jpg,.jpeg,.gif,.webp"
          />
          <p className="text-muted-foreground text-xs">
            PNG, JPG, GIF or WebP. Max 2 MB. SVG is not allowed.
            {badge?.imageKey ? " Leave empty to keep the current image." : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="badge-published"
            name="published"
            defaultChecked={badge?.published ?? true}
          />
          <Label htmlFor="badge-published">Published</Label>
        </div>
      </form>
      <SheetFooter className="px-4">
        <Button type="submit" form="trust-badge-form" disabled={isPending}>
          {isPending ? "Saving..." : "Save badge"}
        </Button>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
      </SheetFooter>
    </SheetContent>
  );
}
