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
import { TRUST_CENTER_DOCUMENT_CATEGORIES } from "@/lib/schemas/trust-center";
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
  const translations = useTranslations("TrustCenterManager.documents");
  const commonTranslations = useTranslations("TrustCenterManager.common");
  const [editing, setEditing] = useState<"new" | TrustDocumentView | null>(
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
        {documents.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {translations("empty")}
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
                        {translations(`categories.${document.category}`)}
                      </Badge>
                      {document.published ? null : (
                        <Badge variant="secondary" className="text-xs">
                          {commonTranslations("draft")}
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
                        : translations("noFile")}
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
                        aria-label={commonTranslations("moveUp", {
                          name: document.title,
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
                          name: document.title,
                        })}
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
                      {commonTranslations("edit")}
                    </Button>
                    <form
                      id={`delete-trust-document-${document.id}`}
                      action={deleteTrustDocumentAction}
                    >
                      <input type="hidden" name="id" value={document.id} />
                      <ConfirmDialog
                        title={translations("deleteTitle")}
                        description={translations("deleteDescription", {
                          name: document.title,
                        })}
                        formId={`delete-trust-document-${document.id}`}
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label={commonTranslations("deleteNamed", {
                            name: document.title,
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
  const translations = useTranslations("TrustCenterManager.documents");
  const commonTranslations = useTranslations("TrustCenterManager.common");
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
        <SheetTitle>
          {isNew ? translations("addTitle") : translations("editTitle")}
        </SheetTitle>
        <SheetDescription>{translations("editorDescription")}</SheetDescription>
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
          <Label htmlFor="document-title">{translations("titleLabel")}</Label>
          <Input
            id="document-title"
            name="title"
            defaultValue={document?.title ?? ""}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="document-description">
            {translations("description")}
          </Label>
          <Textarea
            id="document-description"
            name="description"
            rows={2}
            defaultValue={document?.description ?? ""}
            placeholder={translations("descriptionPlaceholder")}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="document-category">{translations("category")}</Label>
          <Select name="category" defaultValue={document?.category ?? "OTHER"}>
            <SelectTrigger id="document-category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRUST_CENTER_DOCUMENT_CATEGORIES.map((category) => (
                <SelectItem key={category} value={category}>
                  {translations(`categories.${category}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="document-file">
            {document?.file
              ? translations("replaceFile")
              : translations("file")}
          </Label>
          <Input
            id="document-file"
            name="file"
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx"
            required={!document?.file}
          />
          <p className="text-muted-foreground text-xs">
            {translations("fileHint")}
            {document?.file
              ? translations("fileHintCurrent", {
                  fileName: document.file.fileName,
                })
              : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="document-published"
            name="published"
            defaultChecked={document?.published ?? true}
          />
          <Label htmlFor="document-published">
            {commonTranslations("published")}
          </Label>
        </div>
      </form>
      <SheetFooter className="px-4">
        <Button type="submit" form="trust-document-form" disabled={isPending}>
          {isPending ? commonTranslations("saving") : translations("save")}
        </Button>
        <Button type="button" variant="outline" onClick={onDone}>
          {commonTranslations("cancel")}
        </Button>
      </SheetFooter>
    </SheetContent>
  );
}
