"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addUserAction, type UserActionState } from "@/lib/actions/users";

const initialState: UserActionState = undefined;

const SELECT_CLASS =
  "border-input bg-background h-9 rounded-md border px-3 text-sm";

export function AddUserForm() {
  const [state, formAction, isPending] = useActionState(
    addUserAction,
    initialState,
  );

  return (
    <form action={formAction} className="grid gap-3 rounded-md border p-3">
      <p className="text-sm font-medium">Add user</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            minLength={12}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="role">Role</Label>
          <select
            id="role"
            name="role"
            className={SELECT_CLASS}
            defaultValue="REVIEWER"
          >
            <option value="REVIEWER">Reviewer</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending} size="sm">
          {isPending ? "Creating…" : "Create user"}
        </Button>
        {state ? (
          <span
            className={
              state.ok
                ? "text-muted-foreground text-xs"
                : "text-destructive text-xs"
            }
            role="status"
          >
            {state.message}
          </span>
        ) : null}
      </div>
    </form>
  );
}
