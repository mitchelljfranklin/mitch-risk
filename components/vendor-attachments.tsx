"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  addVendorAttachmentAction,
  removeVendorAttachmentAction,
} from "@/lib/actions/vendors";
import { formatDate } from "@/lib/utils";
import { Trash2 } from "lucide-react";

type AttachmentData = {
  id: string;
  fileName: string;
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
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Attachments</span>
      </div>

      {(attachments ?? []).length > 0 ? (
        <div className="flex flex-col divide-y rounded-lg border">
          {(attachments ?? []).map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between gap-3 p-3"
            >
              <div className="flex min-w-0 flex-col">
                <a
                  href={`/api/attachments/${a.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary truncate text-sm hover:underline"
                >
                  {a.fileName} ↗
                </a>
                <span className="text-muted-foreground text-xs">
                  {formatFileSize(a.sizeBytes)} · {formatDate(a.createdAt)}
                </span>
              </div>
              <form action={removeVendorAttachmentAction} className="shrink-0">
                <input type="hidden" name="vendorId" value={vendorId} />
                <input type="hidden" name="attachmentId" value={a.id} />
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

      <form action={addVendorAttachmentAction} className="flex items-end gap-3">
        <input type="hidden" name="vendorId" value={vendorId} />
        <div className="grid flex-1 gap-2">
          <Label htmlFor="vendor-file">Add file</Label>
          <Input
            id="vendor-file"
            name="attachmentFile"
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx"
            required
          />
        </div>
        <Button type="submit" variant="outline" size="sm">
          Upload
        </Button>
      </form>
    </div>
  );
}
