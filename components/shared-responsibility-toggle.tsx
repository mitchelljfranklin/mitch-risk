"use client";

import { useRef } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { toggleSharedResponsibilityAction } from "@/lib/actions/frameworks";

export function SharedResponsibilityToggle({
  controlId,
  defaultValue,
}: {
  controlId: string;
  defaultValue: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={toggleSharedResponsibilityAction}
      className="flex items-center gap-1.5"
    >
      <input type="hidden" name="controlId" value={controlId} />
      <input
        type="hidden"
        name="isShared"
        value={defaultValue ? "false" : "true"}
      />
      <Checkbox
        name="sharedCheckbox"
        defaultChecked={defaultValue}
        className="h-4 w-4 cursor-pointer"
        onCheckedChange={() => {
          formRef.current?.requestSubmit();
        }}
      />
      <span className="text-muted-foreground text-xs">Shared</span>
    </form>
  );
}
