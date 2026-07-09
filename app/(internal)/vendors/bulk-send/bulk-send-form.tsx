"use client";

import { useActionState, useState, startTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  Stepper,
  StepperContent,
  StepperIndicator,
  StepperItem,
  StepperLabel,
  StepperList,
  StepperNext,
  StepperPrevious,
  StepperSeparator,
  StepperTrigger,
} from "@/components/ui/stepper";
import { useFormToast } from "@/hooks/use-form-toast";
import { sendBulkAssessmentsAction } from "@/lib/actions/assessments";
import { VENDOR_TIER_LABELS } from "@/lib/schemas/vendor";

type VendorOption = {
  id: string;
  name: string;
  contactEmail: string;
  tier: string | null;
};

type BulkSendFormProps = {
  vendors: VendorOption[];
  templates: { id: string; label: string }[];
  reviewers: { id: string; label: string }[];
};

type BulkSendState =
  | {
      ok: boolean;
      message: string;
      sent?: number;
      skipped?: number;
      emailFailed?: number;
    }
  | undefined;

export function BulkSendForm({
  vendors,
  templates,
  reviewers,
}: BulkSendFormProps) {
  const [state, formAction, isPending] = useActionState(
    sendBulkAssessmentsAction,
    undefined as BulkSendState,
  );
  useFormToast(state as { ok: boolean; message?: string } | undefined);

  const [templateId, setTemplateId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [reviewerId, setReviewerId] = useState("");
  const [portalPassword, setPortalPassword] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const filtered = vendors.filter((v) =>
    v.name.toLowerCase().includes(search.toLowerCase()),
  );
  const selectedVendors = vendors.filter((v) => selectedIds.has(v.id));

  const allSelected =
    filtered.length > 0 && filtered.every((v) => selectedIds.has(v.id));

  function toggleAll(checked: boolean) {
    if (checked) {
      setSelectedIds(new Set(filtered.map((vendor) => vendor.id)));
    } else {
      setSelectedIds(new Set());
    }
  }

  function handleSend() {
    const formData = new FormData();
    formData.set("templateId", templateId);
    formData.set("dueDate", dueDate);
    formData.set("reviewerId", reviewerId);
    if (portalPassword) formData.set("portalPassword", portalPassword);
    for (const id of selectedIds) {
      formData.append("vendorIds", id);
    }
    startTransition(() => {
      formAction(formData);
    });
  }

  const templateLabel = templates.find((template) => template.id === templateId)?.label ?? "";

  return (
    <Stepper defaultValue="configure" className="flex flex-col gap-6">
      <StepperList className="mx-auto flex w-fit items-center gap-2">
        <StepperItem value="configure">
          <StepperTrigger className="flex flex-col items-center gap-1">
            <StepperIndicator className="flex size-8 items-center justify-center rounded-full border-2 text-sm font-medium" />
            <StepperLabel className="text-xs font-medium">
              Configure
            </StepperLabel>
          </StepperTrigger>
          <StepperSeparator className="bg-muted-foreground/20 mx-2 h-0.5 w-12" />
        </StepperItem>
        <StepperItem value="select">
          <StepperTrigger className="flex flex-col items-center gap-1">
            <StepperIndicator className="flex size-8 items-center justify-center rounded-full border-2 text-sm font-medium" />
            <StepperLabel className="text-xs font-medium">Vendors</StepperLabel>
          </StepperTrigger>
          <StepperSeparator className="bg-muted-foreground/20 mx-2 h-0.5 w-12" />
        </StepperItem>
        <StepperItem value="review">
          <StepperTrigger className="flex flex-col items-center gap-1">
            <StepperIndicator className="flex size-8 items-center justify-center rounded-full border-2 text-sm font-medium" />
            <StepperLabel className="text-xs font-medium">Send</StepperLabel>
          </StepperTrigger>
        </StepperItem>
      </StepperList>

      <StepperContent value="configure" className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="grid gap-2">
            <Label htmlFor="templateId">Template</Label>
            <Select value={templateId} onValueChange={setTemplateId} required>
              <SelectTrigger id="templateId">
                <SelectValue placeholder="Select template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="dueDate">Due date</Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="reviewerId">Reviewer</Label>
            <Select value={reviewerId} onValueChange={setReviewerId}>
              <SelectTrigger id="reviewerId">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                {reviewers.map((reviewer) => (
                  <SelectItem key={reviewer.id} value={reviewer.id}>
                    {reviewer.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="portalPassword">Portal password (optional)</Label>
          <Input
            id="portalPassword"
            value={portalPassword}
            onChange={(event) => setPortalPassword(event.target.value)}
            placeholder="Shared password for all vendors"
            className="w-72"
          />
        </div>

        <StepperNext asChild>
          <Button size="sm" className="w-fit" disabled={!templateId}>
            Next →
          </Button>
        </StepperNext>
      </StepperContent>

      <StepperContent value="select" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Filter vendors..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-64"
          />
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={allSelected}
              onCheckedChange={(c) => toggleAll(c === true)}
            />
            Select all
          </label>
          <span className="text-muted-foreground text-xs">
            {selectedIds.size} selected
          </span>
        </div>

        {filtered.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No vendors match your search.
          </p>
        ) : (
          <div className="max-h-96 overflow-y-auto rounded-lg border">
            {filtered.map((vendor) => (
              <label
                key={vendor.id}
                className="hover:bg-accent/40 flex cursor-pointer items-center gap-3 border-b p-3"
              >
                <Checkbox
                  checked={selectedIds.has(vendor.id)}
                  onCheckedChange={(checked) => {
                    setSelectedIds((prev) => {
                      const next = new Set(prev);
                      if (checked) next.add(vendor.id);
                      else next.delete(vendor.id);
                      return next;
                    });
                  }}
                />
                <div className="flex flex-1 items-center justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{vendor.name}</span>
                    <span className="text-muted-foreground text-xs">
                      {vendor.contactEmail || "No email"}
                    </span>
                  </div>
                  {vendor.tier ? (
                    <Badge variant="outline" className="text-xs">
                      {VENDOR_TIER_LABELS[
                        vendor.tier as keyof typeof VENDOR_TIER_LABELS
                      ] ?? vendor.tier}
                    </Badge>
                  ) : null}
                </div>
              </label>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3">
          <StepperPrevious asChild>
            <Button variant="outline" size="sm">
              ← Back
            </Button>
          </StepperPrevious>
          <StepperNext asChild>
            <Button size="sm" disabled={selectedIds.size === 0}>
              Next →
            </Button>
          </StepperNext>
        </div>
      </StepperContent>

      <StepperContent value="review" className="flex flex-col gap-4">
        <div className="rounded-md border p-4">
          <p className="text-sm">
            Sending{" "}
            <span className="font-semibold">{templateLabel || templateId}</span>{" "}
            to{" "}
            <span className="font-semibold">
              {selectedVendors.length} vendor
              {selectedVendors.length !== 1 ? "s" : ""}
            </span>
          </p>
          {dueDate ? (
            <p className="text-muted-foreground mt-1 text-xs">
              Due: {dueDate}
              {reviewerId
                ? ` · Reviewer: ${reviewers.find((reviewer) => reviewer.id === reviewerId)?.label ?? reviewerId}`
                : ""}
              {portalPassword ? " · Portal password set" : ""}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-1">
            {selectedVendors.map((vendor) => (
              <Badge
                key={vendor.id}
                variant="secondary"
                className="text-xs"
                title={vendor.contactEmail}
              >
                {vendor.name}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <StepperPrevious asChild>
            <Button variant="outline" size="sm">
              ← Back
            </Button>
          </StepperPrevious>
          <Button
            size="sm"
            disabled={isPending || selectedIds.size === 0 || !templateId}
            onClick={handleSend}
          >
            {isPending
              ? "Sending..."
              : `Send to ${selectedIds.size} vendor${selectedIds.size !== 1 ? "s" : ""}`}
          </Button>
        </div>

        {state?.message ? (
          <p
            className={`text-sm ${state.ok ? "text-[var(--rag-green)]" : "text-destructive"}`}
            role="alert"
          >
            {state.message}
          </p>
        ) : null}
      </StepperContent>
    </Stepper>
  );
}
