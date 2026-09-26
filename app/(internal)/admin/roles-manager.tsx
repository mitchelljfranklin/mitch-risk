"use client";

import { useEffect, useMemo, useState } from "react";
import { useActionState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  ALL_PERMISSIONS,
  PERMISSION_GROUPS,
  SYSTEM_ROLE_NAMES,
  summarizeRolePermissions,
} from "@/lib/permissions";
import {
  type RoleActionState,
  createRoleAction,
  deleteRoleAction,
  duplicateRoleAction,
  updateRoleAction,
} from "@/lib/actions/roles";
import { useActionFeedback } from "@/hooks/use-action-feedback";

export type RoleView = {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
  isSystem: boolean;
  userCount: number;
};

const initialState: RoleActionState = undefined;

const COVERAGE_VARIANT = {
  full: "default",
  partial: "secondary",
} as const;

function PermissionSummary({ permissions }: { permissions: string[] }) {
  const summary = summarizeRolePermissions(permissions);
  const active = summary.filter((group) => group.coverage !== "none");
  const granted = permissions.filter((permission) =>
    (ALL_PERMISSIONS as readonly string[]).includes(permission),
  ).length;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-muted-foreground text-xs">
        {granted} / {ALL_PERMISSIONS.length} permissions
      </span>
      {active.map((group) => (
        <Badge
          key={group.resource}
          variant={COVERAGE_VARIANT[group.coverage as "full" | "partial"]}
          className="text-xs"
        >
          {group.label}
          {group.coverage === "partial"
            ? ` ${group.granted}/${group.total}`
            : ""}
        </Badge>
      ))}
    </div>
  );
}

function checkboxState(
  allChecked: boolean,
  someChecked: boolean,
): boolean | "indeterminate" {
  if (allChecked) return true;
  if (someChecked) return "indeterminate";
  return false;
}

function PermissionMatrix({
  selected,
  onToggle,
  onToggleGroup,
  onToggleAll,
}: {
  selected: Set<string>;
  onToggle: (key: string) => void;
  onToggleGroup: (keys: string[], next: boolean) => void;
  onToggleAll: (next: boolean) => void;
}) {
  const allChecked = ALL_PERMISSIONS.every((key) => selected.has(key));
  const someChecked = ALL_PERMISSIONS.some((key) => selected.has(key));

  return (
    <div className="grid gap-4">
      <label className="flex items-center gap-2 text-sm font-medium">
        <Checkbox
          checked={checkboxState(allChecked, someChecked)}
          onCheckedChange={(value) => onToggleAll(value === true)}
        />
        Select all permissions
      </label>

      <div className="grid gap-3">
        {PERMISSION_GROUPS.map((group) => {
          const keys = group.permissions.map((permission) => permission.key);
          const groupChecked = keys.every((key) => selected.has(key));
          const groupSome = keys.some((key) => selected.has(key));
          return (
            <div
              key={group.resource}
              className="grid gap-2 rounded-md border p-3"
            >
              <label className="flex items-center gap-2 text-sm font-medium">
                <Checkbox
                  checked={checkboxState(groupChecked, groupSome)}
                  onCheckedChange={(value) =>
                    onToggleGroup(keys, value === true)
                  }
                />
                {group.label}
              </label>
              <div className="grid gap-2 pl-6 sm:grid-cols-2">
                {group.permissions.map((permission) => (
                  <label
                    key={permission.key}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={selected.has(permission.key)}
                      onCheckedChange={() => onToggle(permission.key)}
                    />
                    {permission.label}
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type EditorTarget = RoleView | "new";

function RoleEditorSheet({
  target,
  onClose,
}: {
  target: EditorTarget;
  onClose: () => void;
}) {
  const isNew = target === "new";
  const role = isNew ? null : target;
  const isAdmin = role?.name === SYSTEM_ROLE_NAMES.ADMIN;
  const nameLocked = role?.isSystem ?? false;

  const action = isNew ? createRoleAction : updateRoleAction;
  const [state, formAction, isPending] = useActionState(action, initialState);

  let submitLabel: string;
  if (isPending) submitLabel = "Saving...";
  else if (isNew) submitLabel = "Create role";
  else submitLabel = "Save changes";
  useActionFeedback(state);

  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(role?.permissions ?? []),
  );

  useEffect(() => {
    if (state?.ok) {
      onClose();
    }
  }, [state, onClose]);

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleGroup(keys: string[], on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const key of keys) {
        if (on) next.add(key);
        else next.delete(key);
      }
      return next;
    });
  }

  function toggleAll(on: boolean) {
    setSelected(on ? new Set(ALL_PERMISSIONS) : new Set());
  }

  return (
    <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
      <SheetHeader>
        <SheetTitle>{isNew ? "Create role" : role?.name}</SheetTitle>
        <SheetDescription>
          {isAdmin
            ? "The Admin role always has every permission and cannot be changed."
            : "Choose the permissions this role grants. Users assigned to this role gain exactly these permissions."}
        </SheetDescription>
      </SheetHeader>

      {isAdmin ? (
        <div className="flex flex-col gap-4 px-4">
          <PermissionSummary permissions={role?.permissions ?? []} />
        </div>
      ) : (
        <form action={formAction} className="flex flex-1 flex-col gap-4 px-4">
          {!isNew ? (
            <input type="hidden" name="roleId" value={role?.id} />
          ) : null}
          {[...selected].map((key) => (
            <input key={key} type="hidden" name="permissions" value={key} />
          ))}

          <div className="grid gap-2">
            <Label htmlFor="role-name">Name</Label>
            <Input
              id="role-name"
              name="name"
              defaultValue={role?.name ?? ""}
              disabled={nameLocked}
              maxLength={50}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="role-description">Description</Label>
            <Input
              id="role-description"
              name="description"
              defaultValue={role?.description ?? ""}
              maxLength={200}
            />
          </div>

          <PermissionMatrix
            selected={selected}
            onToggle={toggle}
            onToggleGroup={toggleGroup}
            onToggleAll={toggleAll}
          />

          <SheetFooter className="px-0">
            <Button type="submit" disabled={isPending}>
              {submitLabel}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </SheetFooter>
        </form>
      )}
    </SheetContent>
  );
}

export function RolesManager({ roles }: { roles: RoleView[] }) {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<EditorTarget | null>(null);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return roles;
    return roles.filter((role) => role.name.toLowerCase().includes(term));
  }, [roles, query]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Input
          placeholder="Search roles…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="max-w-xs"
        />
        <Button size="sm" onClick={() => setEditing("new")}>
          New role
        </Button>
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No roles match your search.
        </p>
      ) : (
        <div className="flex flex-col divide-y rounded-lg border">
          {filtered.map((role) => (
            <div
              key={role.id}
              className="flex items-center justify-between gap-3 p-3"
            >
              <button
                type="button"
                onClick={() => setEditing(role)}
                className="hover:text-primary flex flex-1 flex-col items-start gap-1 text-left"
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  {role.name}
                  {role.isSystem ? (
                    <Badge variant="outline" className="text-xs">
                      System
                    </Badge>
                  ) : null}
                  <span className="text-muted-foreground text-xs font-normal">
                    {role.userCount} {role.userCount === 1 ? "user" : "users"}
                  </span>
                </span>
                <PermissionSummary permissions={role.permissions} />
              </button>

              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditing(role)}
                >
                  Edit
                </Button>
                <form action={duplicateRoleAction}>
                  <input type="hidden" name="roleId" value={role.id} />
                  <Button type="submit" size="sm" variant="ghost">
                    Duplicate
                  </Button>
                </form>
                {!role.isSystem ? (
                  <form id={`delete-role-${role.id}`} action={deleteRoleAction}>
                    <input type="hidden" name="roleId" value={role.id} />
                    <ConfirmDialog
                      title="Delete role?"
                      description={`The "${role.name}" role will be permanently removed. This is only possible when no users are assigned to it.`}
                      confirmLabel="Delete"
                      formId={`delete-role-${role.id}`}
                    >
                      <Button type="button" size="sm" variant="ghost">
                        Delete
                      </Button>
                    </ConfirmDialog>
                  </form>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      <Sheet
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        {editing !== null ? (
          <RoleEditorSheet
            key={editing === "new" ? "new" : editing.id}
            target={editing}
            onClose={() => setEditing(null)}
          />
        ) : null}
      </Sheet>
    </div>
  );
}
