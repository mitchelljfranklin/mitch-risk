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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  deleteTrustDocumentAction,
  moveTrustDocumentAction,
  saveTrustDocumentAction,
} from "@/lib/actions/trust-center";
import { TRUST_CENTER_DOCUMENT_CATEGORY_LABELS } from "@/lib/schemas/trust-center";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { ChevronDown, ChevronUp, FileText, Trash2 } from "lucide-react";

export type TrustDocumentView = {
  id: string;
  title: string;
  description: string;
  category: string;
  published: boolean;
  file: {
    attachmentId: string;
    fileName: string;
    sizeBytes: number;
  } | null;
};

type DocumentsManagerProps = {
  documents: TrustDocumentView[];
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentsManager({ documents }: DocumentsManagerProps) {
  const [editing, setEditing] = useState<"new" | TrustDocumentView | null>(
    null,
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Security documents</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setEditing("new")}>
            Add document
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {documents.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No documents configured. Upload policies, security reports or
            compliance artefacts for public download.
          </p>
        ) : (
          <div className="flex flex-col divide-y rounded-lg border">
            {documents.map((document, index) => {
              const isFirst = index === 0;
              const isLast = index === documents.length - 1;
              return (
                <div
                  key={document.id}
                  className="flex items-start justify-between gap-2 p-3"
                >
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <FileText className="text-muted-foreground size-4" />
                      <span className="truncate text-sm font-medium">
                        {document.title}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {TRUST_CENTER_DOCUMENT_CATEGORY_LABELS[
                          document.category
                        ] ?? document.category}
                      </Badge>
                      {document.published ? null : (
                        <Badge variant="secondary" className="text-xs">
                          Draft
                        </Badge>
                      )}
                    </div>
                    {document.description ? (
                      <p className="text-muted-foreground truncate text-xs">
                        {document.description}
                      </p>
                    ) : null}
                    <p className="text-muted-foreground text-xs">
                      {document.file
                        ? `${document.file.fileName} · ${formatSize(document.file.sizeBytes)}`
                        : "No file uploaded"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <form
                      action={moveTrustDocumentAction}
                      className="flex flex-col"
                    >
                      <input type="hidden" name="id" value={document.id} />
                      <Button
                        type="submit"
                        name="direction"
                        value="up"
                        variant="ghost"
                        size="sm"
                        className="h-5 w-6 p-0"
                        disabled={isFirst}
                        aria-label={`Move ${document.title} up`}
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
                        aria-label={`Move ${document.title} down`}
                      >
                        <ChevronDown className="size-3.5" />
                      </Button>
                    </form>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditing(document)}
                    >
                      Edit
                    </Button>
                    <form
                      id={`delete-trust-document-${document.id}`}
                      action={deleteTrustDocumentAction}
                    >
                      <input type="hidden" name="id" value={document.id} />
                      <ConfirmDialog
                        title="Delete document?"
                        description={`"${document.title}" and its file will be removed from the trust center.`}
                        formId={`delete-trust-document-${document.id}`}
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label={`Delete ${document.title}`}
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
              {editing === "new" ? "Add document" : "Edit document"}
            </SheetTitle>
          </SheetHeader>
          {editing !== null ? (
            <DocumentEditor
              key={editing === "new" ? "new" : editing.id}
              document={editing === "new" ? null : editing}
              onDone={() => setEditing(null)}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </Card>
  );
}

function DocumentEditor({
  document,
  onDone,
}: {
  document: TrustDocumentView | null;
  onDone: () => void;
}) {
  const [state, formAction, isPending] = useActionState(
    saveTrustDocumentAction,
    undefined,
  );
  useActionFeedback(state);

  useEffect(() => {
    if (state?.ok) {
      onDone();
    }
  }, [state, onDone]);

  const isNew = document === null;

  return (
    <SheetContent className="w-full overflow-y-auto sm:max-w-md">
      <SheetHeader>
        <SheetTitle>{isNew ? "Add document" : "Edit document"}</SheetTitle>
        <SheetDescription>
          Published documents are downloadable from the public trust center
          page.
        </SheetDescription>
      </SheetHeader>
      <form
        id="trust-document-form"
        action={formAction}
        className="flex flex-1 flex-col gap-4 px-4"
      >
        {document ? (
          <input type="hidden" name="id" value={document.id} />
        ) : null}
        <div className="grid gap-2">
          <Label htmlFor="document-title">Title</Label>
          <Input
            id="document-title"
            name="title"
            defaultValue={document?.title ?? ""}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="document-description">Description</Label>
          <Textarea
            id="document-description"
            name="description"
            rows={2}
            defaultValue={document?.description ?? ""}
            placeholder="What this document covers"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="document-category">Category</Label>
          <Select name="category" defaultValue={document?.category ?? "OTHER"}>
            <SelectTrigger id="document-category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TRUST_CENTER_DOCUMENT_CATEGORY_LABELS).map(
                ([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="document-file">
            {document?.file ? "Replace file" : "File"}
          </Label>
          <Input
            id="document-file"
            name="file"
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx"
            required={!document?.file}
          />
          <p className="text-muted-foreground text-xs">
            PDF, PNG, JPG, DOCX or XLSX. Max 20 MB.
            {document?.file
              ? ` Current: ${document.file.fileName}. Replacing deletes the old file.`
              : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="document-published"
            name="published"
            defaultChecked={document?.published ?? true}
          />
          <Label htmlFor="document-published">Published</Label>
        </div>
      </form>
      <SheetFooter className="px-4">
        <Button type="submit" form="trust-document-form" disabled={isPending}>
          {isPending ? "Saving..." : "Save document"}
        </Button>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
      </SheetFooter>
    </SheetContent>
  );
}
