"use client";

import { useActionState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type VendorFormState } from "@/lib/actions/vendors";
import { VENDOR_TIER_LABELS, VENDOR_TIERS } from "@/lib/schemas/vendor";

type VendorAction = (
  state: VendorFormState,
  formData: FormData,
) => Promise<VendorFormState>;

type VendorFormProps = {
  action: VendorAction;
  vendorId?: string;
  defaults?: {
    name: string;
    contactName: string;
    contactEmail: string;
    tier: string;
    website: string;
    notes: string;
  };
};

const SELECT_CLASS =
  "border-input bg-background h-9 rounded-md border px-3 text-sm";
const TEXTAREA_CLASS =
  "border-input bg-background min-h-24 rounded-md border px-3 py-2 text-sm";

const initialState: VendorFormState = undefined;

export function VendorForm({ action, vendorId, defaults }: VendorFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const cancelHref = vendorId ? `/vendors/${vendorId}` : "/vendors";

  return (
    <form action={formAction} className="grid gap-4">
      {vendorId ? (
        <input type="hidden" name="vendorId" value={vendorId} />
      ) : null}
      <div className="grid gap-2">
        <Label htmlFor="name">Vendor name</Label>
        <Input id="name" name="name" defaultValue={defaults?.name} required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="contactName">Contact name</Label>
          <Input
            id="contactName"
            name="contactName"
            defaultValue={defaults?.contactName}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="contactEmail">Contact email</Label>
          <Input
            id="contactEmail"
            name="contactEmail"
            type="email"
            defaultValue={defaults?.contactEmail}
            required
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="tier">Tier</Label>
          <select
            id="tier"
            name="tier"
            className={SELECT_CLASS}
            defaultValue={defaults?.tier ?? ""}
          >
            <option value="">Unspecified</option>
            {VENDOR_TIERS.map((tier) => (
              <option key={tier} value={tier}>
                {VENDOR_TIER_LABELS[tier]}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="website">Website</Label>
          <Input id="website" name="website" defaultValue={defaults?.website} />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="notes">Notes</Label>
        <textarea
          id="notes"
          name="notes"
          className={TEXTAREA_CLASS}
          defaultValue={defaults?.notes}
        />
      </div>
      {state?.error ? (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      ) : null}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Save vendor"}
        </Button>
        <Button asChild variant="outline">
          <Link href={cancelHref}>Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
