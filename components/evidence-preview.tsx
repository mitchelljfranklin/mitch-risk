"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type EvidencePreviewProps = {
  evidenceId: string;
  fileName: string;
  mimeType: string;
  children: React.ReactNode;
};

export function EvidencePreview({
  evidenceId,
  fileName,
  mimeType,
  children,
}: EvidencePreviewProps) {
  const [open, setOpen] = useState(false);

  const isPdf = mimeType === "application/pdf";
  const isImage = mimeType.startsWith("image/");

  if (!isPdf && !isImage) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full max-w-3xl p-0 sm:max-w-3xl"
        >
          <SheetHeader className="px-6 pt-6">
            <SheetTitle className="truncate text-sm font-medium">
              {fileName}
            </SheetTitle>
          </SheetHeader>
          <div className="h-[calc(100vh-10rem)] w-full px-6 pb-6">
            {isImage ? (
              <img
                src={`/api/files/${evidenceId}?inline=true`}
                alt={fileName}
                className="h-full w-full rounded-md object-contain"
              />
            ) : (
              <iframe
                src={`/api/files/${evidenceId}?inline=true`}
                title={fileName}
                className="h-full w-full rounded-md border-0"
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="ml-1 h-auto px-1.5 py-0.5"
        onClick={() => setOpen(true)}
        asChild
      >
        <span>
          <ExternalLink className="size-3" />
        </span>
      </Button>
    </>
  );
}
