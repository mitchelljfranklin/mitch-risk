"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  addVendorAttachmentAction,
  removeVendorAttachmentAction,
} from "@/lib/actions/vendors";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import { FileUp, Trash2 } from "lucide-react";

type AttachmentData = {
  id: string;
  fileName: string;
  displayName: string | null;
  sizeBytes: number;
  createdAt: string;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export function VendorAttachments({
  vendorId,
  attachments,
}: {
  vendorId: string;
  attachments?: AttachmentData[];
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function submitUpload(formData: FormData) {
    setUploadError(null);
    setIsUploading(true);
    const result = await addVendorAttachmentAction(formData);
    setIsUploading(false);
    if (!result.ok) setUploadError(result.message);
  }

  function handleDrag(event: React.DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(event.type === "dragenter" || event.type === "dragover");
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("vendorId", vendorId);
    formData.append("attachmentFile", file);
    submitUpload(formData);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Attachments</span>
      </div>

      {(attachments ?? []).length > 0 ? (
        <div className="flex flex-col divide-y rounded-lg border">
          {(attachments ?? []).map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center justify-between gap-3 p-3"
            >
              <div className="flex min-w-0 flex-col">
                <a
                  href={`/api/attachments/${attachment.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary truncate text-sm hover:underline"
                >
                  {attachment.displayName ?? attachment.fileName} ↗
                </a>
                <span className="text-muted-foreground text-xs">
                  {formatFileSize(attachment.sizeBytes)} ·{" "}
                  {formatDate(attachment.createdAt)}
                </span>
              </div>
              <form action={removeVendorAttachmentAction} className="shrink-0">
                <input type="hidden" name="vendorId" value={vendorId} />
                <input
                  type="hidden"
                  name="attachmentId"
                  value={attachment.id}
                />
                <Button type="submit" variant="ghost" size="sm">
                  <Trash2 className="size-3.5" />
                </Button>
              </form>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          No attachments yet. Upload contracts, letters, or other documents.
        </p>
      )}

      <Separator />

      <form action={submitUpload} className="flex flex-col gap-2">
        <input type="hidden" name="vendorId" value={vendorId} />
        <div
          role="button"
          tabIndex={0}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ")
              inputRef.current?.click();
          }}
          className={cn(
            "flex flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed p-4 transition-colors",
            dragActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50",
          )}
        >
          <FileUp className="text-muted-foreground size-5" />
          <span className="text-muted-foreground text-xs">
            Drop a file or click to browse
          </span>
          <Input
            ref={inputRef}
            id="vendor-file"
            name="attachmentFile"
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx"
            required
            className="hidden"
          />
        </div>

        {uploadError ? (
          <p className="text-destructive text-xs" role="alert">
            {uploadError}
          </p>
        ) : null}

        <Button
          type="submit"
          variant="outline"
          size="sm"
          disabled={isUploading}
        >
          <FileUp className="size-3.5" />
          {isUploading ? "Uploading…" : "Upload"}
        </Button>
      </form>
    </div>
  );
}
