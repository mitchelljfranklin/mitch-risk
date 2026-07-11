"use client";

import { useActionState } from "react";
import Link from "next/link";

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
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { type VendorFormState } from "@/lib/actions/vendors";
import {
  DATA_SENSITIVITIES,
  DATA_SENSITIVITY_LABELS,
  VENDOR_TIER_LABELS,
  VENDOR_TIERS,
} from "@/lib/schemas/vendor";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { VendorAttachments } from "./vendor-attachments";

type VendorAction = (
  state: VendorFormState,
  formData: FormData,
) => Promise<VendorFormState>;

type VendorFormProps = {
  action: VendorAction;
  vendorId?: string;
  mode?: "create" | "edit";
  owners: { id: string; name: string }[];
  attachments?: {
    id: string;
    fileName: string;
    displayName: string | null;
    sizeBytes: number;
    createdAt: string;
  }[];
  defaults?: {
    name: string;
    contactName: string;
    contactEmail: string;
    tier: string;
    website: string;
    notes: string;
    serviceDescription: string;
    dataSensitivity: string;
    contractRenewalDate: string;
    contractValue: string;
    geographicRisk: string;
    ownerId: string;
  };
};

const initialState: VendorFormState = undefined;

export function VendorForm({
  action,
  vendorId,
  mode,
  owners,
  attachments,
  defaults,
}: VendorFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  useActionFeedback(state);
  const cancelHref = vendorId ? `/vendors/${vendorId}` : "/vendors";
  const isEdit = mode === "edit" || Boolean(vendorId);

  return (
    <>
      <form id="vendor-edit-form" action={formAction} className="grid gap-4">
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
        <Separator className="my-1" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="tier">Tier</Label>
            <Select name="tier" defaultValue={defaults?.tier ?? ""}>
              <SelectTrigger id="tier">
                <SelectValue placeholder="Unspecified" />
              </SelectTrigger>
              <SelectContent>
                {VENDOR_TIERS.map((tier) => (
                  <SelectItem key={tier} value={tier}>
                    {VENDOR_TIER_LABELS[tier]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              name="website"
              defaultValue={defaults?.website}
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="ownerId">Risk owner</Label>
            <Select name="ownerId" defaultValue={defaults?.ownerId ?? ""}>
              <SelectTrigger id="ownerId">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                {owners.map((owner) => (
                  <SelectItem key={owner.id} value={owner.id}>
                    {owner.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="dataSensitivity">Data sensitivity</Label>
            <Select
              name="dataSensitivity"
              defaultValue={defaults?.dataSensitivity ?? ""}
            >
              <SelectTrigger id="dataSensitivity">
                <SelectValue placeholder="Unspecified" />
              </SelectTrigger>
              <SelectContent>
                {DATA_SENSITIVITIES.map((level) => (
                  <SelectItem key={level} value={level}>
                    {DATA_SENSITIVITY_LABELS[level]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="grid gap-2">
              <Label htmlFor="contractValue">Contract value</Label>
              <Select
                name="contractValue"
                defaultValue={defaults?.contractValue ?? ""}
              >
                <SelectTrigger id="contractValue">
                  <SelectValue placeholder="Unspecified" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">None</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="geographicRisk">Geographic risk</Label>
              <Select
                name="geographicRisk"
                defaultValue={defaults?.geographicRisk ?? ""}
              >
                <SelectTrigger id="geographicRisk">
                  <SelectValue placeholder="Unspecified" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">None</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <Separator className="my-1" />
        <div className="grid gap-2">
          <Label htmlFor="serviceDescription">Service provided</Label>
          <Input
            id="serviceDescription"
            name="serviceDescription"
            placeholder="e.g. Cloud email hosting"
            defaultValue={defaults?.serviceDescription}
          />
        </div>
        <div className="grid gap-2 sm:max-w-xs">
          <Label htmlFor="contractRenewalDate">Contract renewal date</Label>
          <Input
            id="contractRenewalDate"
            name="contractRenewalDate"
            type="date"
            defaultValue={defaults?.contractRenewalDate}
          />
        </div>
        <Separator className="my-1" />
        <div className="grid gap-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            name="notes"
            defaultValue={defaults?.notes}
            rows={4}
          />
        </div>
        {state && "error" in state ? (
          <p className="text-destructive text-sm" role="alert">
            {state.error}
          </p>
        ) : null}
      </form>
      {isEdit && vendorId ? (
        <div className="rounded-lg border p-4">
          <VendorAttachments vendorId={vendorId} attachments={attachments} />
        </div>
      ) : null}
      <div className="flex items-center gap-3">
        <Button type="submit" form="vendor-edit-form" disabled={isPending}>
          {isPending ? "Saving..." : isEdit ? "Save changes" : "Create vendor"}
        </Button>
        <Button asChild variant="outline">
          <Link href={cancelHref}>Cancel</Link>
        </Button>
      </div>
    </>
  );
}
