"use client";

import { useState } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { PERMISSION_GROUPS } from "@/lib/permissions";

type PermissionSelectorProps = {
  defaultFullAccess?: boolean;
};

export function PermissionSelector({
  defaultFullAccess = true,
}: PermissionSelectorProps) {
  const [fullAccess, setFullAccess] = useState(defaultFullAccess);

  return (
    <div className="flex flex-col gap-4 rounded-md border p-4">
      <div className="flex items-center gap-3">
        <Checkbox
          id="fullAccess"
          name="fullAccess"
          checked={fullAccess}
          onCheckedChange={(checked) => setFullAccess(!!checked)}
        />
        <Label htmlFor="fullAccess" className="text-sm font-medium">
          Full access
        </Label>
      </div>
      <p className="text-muted-foreground text-xs">
        When selected, the key grants all permissions. Uncheck to restrict the
        key to a specific set of permissions.
      </p>

      {!fullAccess && (
        <div className="flex flex-col gap-4 border-t pt-4">
          {PERMISSION_GROUPS.map((group) => (
            <fieldset key={group.resource} className="flex flex-col gap-2">
              <legend className="text-xs font-semibold">{group.label}</legend>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {group.permissions.map((permission) => (
                  <div
                    key={permission.key}
                    className="flex items-center gap-2"
                  >
                    <Checkbox
                      id={`perm-${permission.key}`}
                      name="permissions"
                      value={permission.key}
                    />
                    <Label
                      htmlFor={`perm-${permission.key}`}
                      className="text-xs font-normal"
                    >
                      {permission.label}
                    </Label>
                  </div>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
      )}
    </div>
  );
}
