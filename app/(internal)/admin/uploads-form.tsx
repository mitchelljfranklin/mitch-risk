"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveUploadSettings } from "./actions";
import { useActionFeedback } from "@/hooks/use-action-feedback";

type UploadsFormProps = {
  maxUploadMb: number;
  allowedExtensions: string[];
};

const ALL_EXTENSIONS = [
  "pdf",
  "png",
  "jpg",
  "jpeg",
  "docx",
  "xlsx",
  "csv",
  "txt",
  "zip",
  "pptx",
];

export function UploadsForm({
  maxUploadMb,
  allowedExtensions,
}: UploadsFormProps) {
  const [state, action, isPending] = useActionState(
    saveUploadSettings,
    undefined,
  );
  useActionFeedback(state);

  return (
    <form action={action} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="maxUploadMb">Maximum file upload size (MB)</Label>
        <p className="text-muted-foreground text-xs">
          Evidence files larger than this limit are rejected during upload.
        </p>
        <Input
          id="maxUploadMb"
          name="maxUploadMb"
          type="number"
          min={1}
          defaultValue={maxUploadMb}
          className="w-32"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Allowed file extensions</Label>
        <p className="text-muted-foreground text-xs">
          File types vendors can upload as evidence. Select at least one.
        </p>
        <div className="flex flex-wrap gap-3">
          {ALL_EXTENSIONS.map((ext) => {
            const checked = allowedExtensions.includes(ext);
            return (
              <label key={ext} className="flex items-center gap-2 text-sm">
                <Checkbox
                  key={`${ext}-${checked}`}
                  name="allowedExtensions"
                  value={ext}
                  defaultChecked={checked}
                />
                .{ext}
              </label>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending} size="sm">
          {isPending ? "Saving..." : "Save"}
        </Button>
      </div>
    </form>
  );
}
