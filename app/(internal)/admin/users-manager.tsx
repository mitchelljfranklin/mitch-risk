"use client";

import { useEffect, useMemo, useState } from "react";
import { useActionState } from "react";
import { useFormatter, useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
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
  getUserDeletionImpactAction,
  resetPasswordAction,
  toggleUserAction,
  type UserActionState,
} from "@/lib/actions/users";
import type { DeletionImpact } from "@/lib/db/users";
import { useActionFeedback } from "@/hooks/use-action-feedback";

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
  const translations = useTranslations("Admin.users");
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
        <Label htmlFor="new-name">{translations("name")}</Label>
        <Input id="new-name" name="name" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="new-email">{translations("email")}</Label>
        <Input id="new-email" name="email" type="email" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="new-password">{translations("password")}</Label>
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
        <Label htmlFor="new-role">{translations("role")}</Label>
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
          {isPending ? translations("creating") : translations("create")}
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          {translations("cancel")}
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
  const translations = useTranslations("Admin.users");
  const [deletionImpact, setDeletionImpact] = useState<DeletionImpact | null>(
    null,
  );
  const [loadingImpact, setLoadingImpact] = useState(false);

  const loadImpact = async () => {
    setLoadingImpact(true);
    const formData = new FormData();
    formData.set("userId", user.id);
    const impact = await getUserDeletionImpactAction(formData);
    setDeletionImpact(impact);
    setLoadingImpact(false);
  };

  return (
    <div className="flex flex-1 flex-col gap-6 px-4">
      <div className="grid gap-2">
        <Label htmlFor={`role-${user.id}`}>{translations("role")}</Label>
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
          <SubmitButton type="submit" size="sm" variant="secondary">
            {translations("save")}
          </SubmitButton>
        </form>
      </div>

      <div className="grid gap-2">
        <Label>{translations("access")}</Label>
        <form id={`toggle-user-${user.id}`} action={toggleUserAction}>
          <input type="hidden" name="userId" value={user.id} />
          <input
            type="hidden"
            name="disabled"
            value={user.disabled ? "false" : "true"}
          />
          {user.disabled ? (
            <SubmitButton type="submit" size="sm" variant="secondary">
              {translations("enableSignIn")}
            </SubmitButton>
          ) : (
            <ConfirmDialog
              title={translations("disableTitle")}
              description={translations("disableDescription", {
                name: user.name,
              })}
              confirmLabel={translations("disable")}
              formId={`toggle-user-${user.id}`}
            >
              <Button type="button" size="sm" variant="secondary">
                {translations("disableSignIn")}
              </Button>
            </ConfirmDialog>
          )}
        </form>
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`password-${user.id}`}>
          {translations("password")}
        </Label>
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
              placeholder={translations("newPasswordPlaceholder")}
              minLength={12}
              className="flex-1"
            />
            <ConfirmDialog
              title={translations("resetTitle")}
              description={translations("resetDescription", {
                name: user.name,
              })}
              confirmLabel={translations("reset")}
              variant="default"
              formId={`reset-password-${user.id}`}
            >
              <Button type="button" size="sm" variant="secondary">
                {translations("reset")}
              </Button>
            </ConfirmDialog>
          </form>
        ) : (
          <p className="text-muted-foreground text-sm">
            {translations("ssoPassword")}
          </p>
        )}
      </div>

      {!isSelf ? (
        <div className="grid gap-2 border-t pt-4">
          <Label>{translations("dangerZone")}</Label>
          {deletionImpact ? (
            <form id={`delete-user-${user.id}`} action={deleteUserAction}>
              <input type="hidden" name="userId" value={user.id} />
              <ConfirmDialog
                title={translations("deleteTitle")}
                description={
                  <span>
                    {translations("deleteDescription", { name: user.name })}
                    <ul className="mt-2 list-disc pl-4 text-sm">
                      {deletionImpact.ownedVendors > 0 && (
                        <li>
                          {translations("ownedVendors", {
                            count: deletionImpact.ownedVendors,
                          })}
                        </li>
                      )}
                      {deletionImpact.reviewingAssessments > 0 && (
                        <li>
                          {translations("reviewingAssessments", {
                            count: deletionImpact.reviewingAssessments,
                          })}
                        </li>
                      )}
                      {deletionImpact.resolvedFindings > 0 && (
                        <li>
                          {translations("resolvedFindings", {
                            count: deletionImpact.resolvedFindings,
                          })}
                        </li>
                      )}
                      {deletionImpact.answerReviews > 0 && (
                        <li>
                          {translations("answerReviews", {
                            count: deletionImpact.answerReviews,
                          })}
                        </li>
                      )}
                      {deletionImpact.createdApiKeys > 0 && (
                        <li>
                          {translations("createdApiKeys", {
                            count: deletionImpact.createdApiKeys,
                          })}
                        </li>
                      )}
                    </ul>
                    <p className="mt-2">{translations("auditPreserved")}</p>
                  </span>
                }
                confirmLabel={translations("delete")}
                formId={`delete-user-${user.id}`}
              >
                <Button type="button" size="sm" variant="destructive">
                  {translations("deleteUser")}
                </Button>
              </ConfirmDialog>
            </form>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={loadImpact}
              disabled={loadingImpact}
            >
              {loadingImpact
                ? translations("loading")
                : translations("deleteUser")}
            </Button>
          )}
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
  const translations = useTranslations("Admin.users");
  const dateFormatter = useFormatter();
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
          aria-label={translations("searchLabel")}
          placeholder={translations("searchPlaceholder")}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="max-w-xs"
        />
        <Button size="sm" onClick={() => setEditing("new")}>
          {translations("newUser")}
        </Button>
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {users.length === 0 ? translations("empty") : translations("noMatch")}
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
                  {translations("added", {
                    date: dateFormatter.dateTime(new Date(user.createdAt), {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    }),
                  })}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="secondary" className="text-xs">
                  {user.roleName}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {user.isSsoUser ? translations("sso") : translations("local")}
                </Badge>
                {user.disabled ? (
                  <Badge variant="destructive" className="text-xs">
                    {translations("disabled")}
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
              <SheetTitle>{translations("addTitle")}</SheetTitle>
              <SheetDescription>
                {translations("addDescription")}
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
