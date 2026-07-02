"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addUserAction, type UserActionState } from "@/lib/actions/users";
import { useFormToast } from "@/hooks/use-form-toast";

const initialState: UserActionState = undefined;

type RoleOption = { id: string; name: string };

export function AddUserForm({ roles }: { roles: RoleOption[] }) {
  const [state, formAction, isPending] = useActionState(
    addUserAction,
    initialState,
  );
  useFormToast(state);

  const defaultRole =
    roles.find((role) => role.name === "Reviewer") ?? roles[0];

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
          <Label htmlFor="roleId">Role</Label>
          <Select name="roleId" defaultValue={defaultRole?.id}>
            <SelectTrigger id="roleId">
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
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending} size="sm">
          {isPending ? "Creating..." : "Create user"}
        </Button>
      </div>
    </form>
  );
}
