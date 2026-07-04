"use client";

import { useEffect, useMemo, useState } from "react";
import { useActionState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  addUserAction,
  changeRoleAction,
  deleteUserAction,
  resetPasswordAction,
  toggleUserAction,
  type UserActionState,
} from "@/lib/actions/users";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { formatDate } from "@/lib/utils";

export type UserView = {
  id: string;
  name: string;
  email: string;
  roleId: string;
  roleName: string;
  disabled: boolean;
  createdAt: Date | string;
  isSsoUser: boolean;
  hasLocalPassword: boolean;
};

type RoleOption = { id: string; name: string };

const initialState: UserActionState = undefined;

type EditorTarget = UserView | "new";

function NewUserForm({
  roles,
  onClose,
}: {
  roles: RoleOption[];
  onClose: () => void;
}) {
  const [state, formAction, isPending] = useActionState(
    addUserAction,
    initialState,
  );
  useActionFeedback(state);

  useEffect(() => {
    if (state?.ok) {
      onClose();
    }
  }, [state, onClose]);

  const defaultRole =
    roles.find((role) => role.name === "Reviewer") ?? roles[0];

  return (
    <form action={formAction} className="flex flex-1 flex-col gap-4 px-4">
      <div className="grid gap-2">
        <Label htmlFor="new-name">Name</Label>
        <Input id="new-name" name="name" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="new-email">Email</Label>
        <Input id="new-email" name="email" type="email" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="new-password">Password</Label>
        <Input
          id="new-password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={12}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="new-role">Role</Label>
        <Select name="roleId" defaultValue={defaultRole?.id}>
          <SelectTrigger id="new-role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {roles.map((role) => (
              <SelectItem key={role.id} value={role.id}>
                {role.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <SheetFooter className="px-0">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creating..." : "Create user"}
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
      </SheetFooter>
    </form>
  );
}

function EditUserForm({
  user,
  roles,
  isSelf,
}: {
  user: UserView;
  roles: RoleOption[];
  isSelf: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col gap-6 px-4">
      <div className="grid gap-2">
        <Label htmlFor={`role-${user.id}`}>Role</Label>
        <form action={changeRoleAction} className="flex items-center gap-2">
          <input type="hidden" name="userId" value={user.id} />
          <Select key={user.roleId} name="roleId" defaultValue={user.roleId}>
            <SelectTrigger id={`role-${user.id}`} className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {roles.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" size="sm" variant="secondary">
            Save
          </Button>
        </form>
      </div>

      <div className="grid gap-2">
        <Label>Access</Label>
        <form id={`toggle-user-${user.id}`} action={toggleUserAction}>
          <input type="hidden" name="userId" value={user.id} />
          <input
            type="hidden"
            name="disabled"
            value={user.disabled ? "false" : "true"}
          />
          {user.disabled ? (
            <Button type="submit" size="sm" variant="secondary">
              Enable sign-in
            </Button>
          ) : (
            <ConfirmDialog
              title="Disable user?"
              description={`${user.name} will no longer be able to sign in. Their data is preserved.`}
              confirmLabel="Disable"
              formId={`toggle-user-${user.id}`}
            >
              <Button type="button" size="sm" variant="secondary">
                Disable sign-in
              </Button>
            </ConfirmDialog>
          )}
        </form>
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`password-${user.id}`}>Password</Label>
        {user.hasLocalPassword ? (
          <form
            id={`reset-password-${user.id}`}
            action={resetPasswordAction}
            className="flex items-center gap-2"
          >
            <input type="hidden" name="userId" value={user.id} />
            <Input
              id={`password-${user.id}`}
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="New password"
              minLength={12}
              className="flex-1"
            />
            <ConfirmDialog
              title="Reset password?"
              description={`This overwrites ${user.name}'s current password. They must use the new password to sign in.`}
              confirmLabel="Reset"
              variant="default"
              formId={`reset-password-${user.id}`}
            >
              <Button type="button" size="sm" variant="secondary">
                Reset
              </Button>
            </ConfirmDialog>
          </form>
        ) : (
          <p className="text-muted-foreground text-sm">
            This account signs in via SSO — its password is managed by the
            identity provider.
          </p>
        )}
      </div>

      {!isSelf ? (
        <div className="grid gap-2 border-t pt-4">
          <Label>Danger zone</Label>
          <form id={`delete-user-${user.id}`} action={deleteUserAction}>
            <input type="hidden" name="userId" value={user.id} />
            <ConfirmDialog
              title="Delete user?"
              description={`${user.name} will be permanently removed. Their audit history and past review decisions are kept but shown as "Deleted user". This cannot be undone.`}
              confirmLabel="Delete"
              formId={`delete-user-${user.id}`}
            >
              <Button type="button" size="sm" variant="destructive">
                Delete user
              </Button>
            </ConfirmDialog>
          </form>
        </div>
      ) : null}
    </div>
  );
}

export function UsersManager({
  users,
  roles,
  currentUserId,
}: {
  users: UserView[];
  roles: RoleOption[];
  currentUserId: string;
}) {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<EditorTarget | null>(null);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return users;
    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term),
    );
  }, [users, query]);

  const editingUser =
    editing && editing !== "new"
      ? (users.find((user) => user.id === editing.id) ?? null)
      : null;

  // Deriving `open` from the live list means a deleted user auto-closes the
  // editor without a setState-in-effect.
  const isOpen = editing === "new" || editingUser !== null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Input
          aria-label="Search staff"
          placeholder="Search staff…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="max-w-xs"
        />
        <Button size="sm" onClick={() => setEditing("new")}>
          New user
        </Button>
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {users.length === 0 ? "No users yet." : "No staff match your search."}
        </p>
      ) : (
        <div className="flex flex-col divide-y rounded-lg border">
          {filtered.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => setEditing(user)}
              className="hover:bg-muted/50 flex flex-wrap items-center justify-between gap-2 p-3 text-left"
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium">
                  {user.name}{" "}
                  <span className="text-muted-foreground text-xs font-normal">
                    {user.email}
                  </span>
                </span>
                <span className="text-muted-foreground text-xs">
                  Added {formatDate(user.createdAt)}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="secondary" className="text-xs">
                  {user.roleName}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {user.isSsoUser ? "SSO" : "Local"}
                </Badge>
                {user.disabled ? (
                  <Badge variant="destructive" className="text-xs">
                    Disabled
                  </Badge>
                ) : null}
              </div>
            </button>
          ))}
        </div>
      )}

      <Sheet
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        {editing === "new" ? (
          <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
            <SheetHeader>
              <SheetTitle>Add user</SheetTitle>
              <SheetDescription>
                Create a staff account with a starting role and password.
              </SheetDescription>
            </SheetHeader>
            <NewUserForm roles={roles} onClose={() => setEditing(null)} />
          </SheetContent>
        ) : editingUser ? (
          <SheetContent
            key={editingUser.id}
            className="w-full overflow-y-auto sm:max-w-lg"
          >
            <SheetHeader>
              <SheetTitle>{editingUser.name}</SheetTitle>
              <SheetDescription>{editingUser.email}</SheetDescription>
            </SheetHeader>
            <EditUserForm
              user={editingUser}
              roles={roles}
              isSelf={editingUser.id === currentUserId}
            />
          </SheetContent>
        ) : null}
      </Sheet>
    </div>
  );
}
