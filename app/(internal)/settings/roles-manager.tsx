"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PERMISSION_GROUPS, SYSTEM_ROLE_NAMES } from "@/lib/permissions";
import {
  type RoleActionState,
  createRoleAction,
  deleteRoleAction,
  updateRoleAction,
} from "@/lib/actions/roles";
import { useFormToast } from "@/hooks/use-form-toast";

export type RoleView = {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
  isSystem: boolean;
  userCount: number;
};

const initialState: RoleActionState = undefined;

function PermissionMatrix({
  selected,
  disabled,
}: {
  selected: string[];
  disabled: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {PERMISSION_GROUPS.map((group) => (
        <div key={group.resource} className="grid gap-2 rounded-md border p-3">
          <p className="text-sm font-medium">{group.label}</p>
          <div className="grid gap-2">
            {group.permissions.map((permission) => (
              <label
                key={permission.key}
                className="flex items-center gap-2 text-sm"
              >
                <Checkbox
                  name="permissions"
                  value={permission.key}
                  defaultChecked={selected.includes(permission.key)}
                  disabled={disabled}
                />
                {permission.label}
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function RoleCreator() {
  const [state, formAction, isPending] = useActionState(
    createRoleAction,
    initialState,
  );
  useFormToast(state);

  return (
    <form action={formAction} className="grid gap-4 rounded-lg border p-4">
      <p className="text-sm font-medium">Create custom role</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="new-role-name">Name</Label>
          <Input id="new-role-name" name="name" required maxLength={50} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="new-role-description">Description</Label>
          <Input id="new-role-description" name="description" maxLength={200} />
        </div>
      </div>
      <PermissionMatrix selected={[]} disabled={false} />
      <div>
        <Button type="submit" disabled={isPending} size="sm">
          {isPending ? "Creating..." : "Create role"}
        </Button>
      </div>
    </form>
  );
}

function RoleEditor({ role }: { role: RoleView }) {
  const [state, formAction, isPending] = useActionState(
    updateRoleAction,
    initialState,
  );
  useFormToast(state);

  const isAdmin = role.name === SYSTEM_ROLE_NAMES.ADMIN;
  const nameLocked = role.isSystem;
  const permissionsLocked = isAdmin;

  return (
    <div className="grid gap-4 rounded-lg border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">
            {role.name}
            {role.isSystem ? (
              <span className="text-muted-foreground ml-2 text-xs">
                System role
              </span>
            ) : null}
          </p>
          <p className="text-muted-foreground text-xs">
            {role.userCount} {role.userCount === 1 ? "user" : "users"}
          </p>
        </div>
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

      <form action={formAction} className="grid gap-4">
        <input type="hidden" name="roleId" value={role.id} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor={`role-name-${role.id}`}>Name</Label>
            <Input
              id={`role-name-${role.id}`}
              name="name"
              defaultValue={role.name}
              disabled={nameLocked}
              maxLength={50}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`role-description-${role.id}`}>Description</Label>
            <Input
              id={`role-description-${role.id}`}
              name="description"
              defaultValue={role.description ?? ""}
              maxLength={200}
            />
          </div>
        </div>

        <PermissionMatrix
          selected={role.permissions}
          disabled={permissionsLocked}
        />

        {permissionsLocked ? (
          <p className="text-muted-foreground text-xs">
            The Admin role always has every permission and cannot be changed.
          </p>
        ) : (
          <div>
            <Button type="submit" disabled={isPending} size="sm">
              {isPending ? "Saving..." : "Save changes"}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}

export function RolesManager({ roles }: { roles: RoleView[] }) {
  return (
    <div className="flex flex-col gap-4">
      <RoleCreator />
      {roles.map((role) => (
        <RoleEditor key={role.id} role={role} />
      ))}
    </div>
  );
}
