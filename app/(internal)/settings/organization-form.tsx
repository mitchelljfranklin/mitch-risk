"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { saveOrganizationSettings, type SettingsActionState } from "./actions";
import { useFormToast } from "@/hooks/use-form-toast";

type OrganizationFormProps = {
  name: string;
  supportEmail: string;
};

const initialState: SettingsActionState = undefined;

export function OrganizationForm({
  name,
  supportEmail,
}: OrganizationFormProps) {
  const [state, formAction, isPending] = useActionState(
    saveOrganizationSettings,
    initialState,
  );
  useFormToast(state);

  return (
    <form action={formAction} className="grid max-w-md gap-4">
      <div className="grid gap-2">
        <Label htmlFor="org-name">Organization name</Label>
        <Input id="org-name" name="name" defaultValue={name} required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="org-support-email">Support email</Label>
        <Input
          id="org-support-email"
          name="supportEmail"
          type="email"
          defaultValue={supportEmail}
        />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending} size="sm">
          {isPending ? "Saving..." : "Save"}
        </Button>
      </div>
    </form>
  );
}
