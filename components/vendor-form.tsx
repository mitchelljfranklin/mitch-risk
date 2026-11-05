"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

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
import { DATA_SENSITIVITIES, VENDOR_TIERS } from "@/lib/schemas/vendor";
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
    externalId: string;
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
    tags: string;
    ownerId: string;
  };
};

const RISK_LEVELS = ["NONE", "LOW", "MEDIUM", "HIGH"] as const;

const initialState: VendorFormState = undefined;

export function VendorForm({
  action,
  vendorId,
  mode,
  owners,
  attachments,
  defaults,
}: VendorFormProps) {
  const translations = useTranslations("Vendors.form");
  const commonTranslations = useTranslations("Common");
  const [state, formAction, isPending] = useActionState(action, initialState);
  useActionFeedback(state);
  const cancelHref = vendorId ? `/vendors/${vendorId}` : "/vendors";
  const isEdit = mode === "edit" || Boolean(vendorId);

  let submitLabel = translations("create");
  if (isPending) {
    submitLabel = translations("saving");
  } else if (isEdit) {
    submitLabel = translations("saveChanges");
  }

  return (
    <>
      <form id="vendor-edit-form" action={formAction} className="grid gap-4">
        {vendorId ? (
          <input type="hidden" name="vendorId" value={vendorId} />
        ) : null}
        <div className="grid gap-2">
          <Label htmlFor="name">{translations("vendorName")}</Label>
          <Input id="name" name="name" defaultValue={defaults?.name} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="externalId">{translations("externalId")}</Label>
          <Input
            id="externalId"
            name="externalId"
            placeholder={translations("externalIdPlaceholder")}
            defaultValue={defaults?.externalId}
          />
          <span className="text-muted-foreground text-[11px]">
            {translations("externalIdHint")}
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="contactName">{translations("contactName")}</Label>
            <Input
              id="contactName"
              name="contactName"
              defaultValue={defaults?.contactName}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="contactEmail">{translations("contactEmail")}</Label>
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
            <Label htmlFor="tier">{translations("tier")}</Label>
            <Select name="tier" defaultValue={defaults?.tier ?? ""}>
              <SelectTrigger id="tier">
                <SelectValue placeholder={translations("unspecified")} />
              </SelectTrigger>
              <SelectContent>
                {VENDOR_TIERS.map((tier) => (
                  <SelectItem key={tier} value={tier}>
                    {commonTranslations(`tiers.${tier}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="website">{translations("website")}</Label>
            <Input
              id="website"
              name="website"
              defaultValue={defaults?.website}
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="ownerId">{translations("riskOwner")}</Label>
            <Select name="ownerId" defaultValue={defaults?.ownerId ?? ""}>
              <SelectTrigger id="ownerId">
                <SelectValue placeholder={translations("unassigned")} />
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
            <Label htmlFor="dataSensitivity">
              {translations("dataSensitivity")}
            </Label>
            <Select
              name="dataSensitivity"
              defaultValue={defaults?.dataSensitivity ?? ""}
            >
              <SelectTrigger id="dataSensitivity">
                <SelectValue placeholder={translations("unspecified")} />
              </SelectTrigger>
              <SelectContent>
                {DATA_SENSITIVITIES.map((level) => (
                  <SelectItem key={level} value={level}>
                    {translations(`dataSensitivities.${level}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="grid gap-2">
              <Label htmlFor="contractValue">
                {translations("contractValue")}
              </Label>
              <Select
                name="contractValue"
                defaultValue={defaults?.contractValue ?? ""}
              >
                <SelectTrigger id="contractValue">
                  <SelectValue placeholder={translations("unspecified")} />
                </SelectTrigger>
                <SelectContent>
                  {RISK_LEVELS.map((level) => (
                    <SelectItem key={level} value={level}>
                      {translations(`levels.${level}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="geographicRisk">
                {translations("geographicRisk")}
              </Label>
              <Select
                name="geographicRisk"
                defaultValue={defaults?.geographicRisk ?? ""}
              >
                <SelectTrigger id="geographicRisk">
                  <SelectValue placeholder={translations("unspecified")} />
                </SelectTrigger>
                <SelectContent>
                  {RISK_LEVELS.map((level) => (
                    <SelectItem key={level} value={level}>
                      {translations(`levels.${level}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="tags">{translations("tags")}</Label>
              <Input
                id="tags"
                name="tags"
                placeholder={translations("tagsPlaceholder")}
                defaultValue={defaults?.tags ?? ""}
              />
              <span className="text-muted-foreground text-[11px]">
                {translations("tagsHint")}
              </span>
            </div>
          </div>
        </div>
        <Separator className="my-1" />
        <div className="grid gap-2">
          <Label htmlFor="serviceDescription">
            {translations("serviceProvided")}
          </Label>
          <Input
            id="serviceDescription"
            name="serviceDescription"
            placeholder={translations("servicePlaceholder")}
            defaultValue={defaults?.serviceDescription}
          />
        </div>
        <div className="grid gap-2 sm:max-w-xs">
          <Label htmlFor="contractRenewalDate">
            {translations("contractRenewalDate")}
          </Label>
          <Input
            id="contractRenewalDate"
            name="contractRenewalDate"
            type="date"
            defaultValue={defaults?.contractRenewalDate}
          />
        </div>
        <Separator className="my-1" />
        <div className="grid gap-2">
          <Label htmlFor="notes">{translations("notes")}</Label>
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
          {submitLabel}
        </Button>
        <Button asChild variant="outline">
          <Link href={cancelHref}>{translations("cancel")}</Link>
        </Button>
      </div>
    </>
  );
}
