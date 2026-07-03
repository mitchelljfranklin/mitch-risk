"use client";

import { useActionState, useState } from "react";

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
import { Badge } from "@/components/ui/badge";
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

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  function toggleAll(checked: boolean) {
    if (checked) {
      setSelectedIds(new Set(filtered.map((v) => v.id)));
    } else {
      setSelectedIds(new Set());
    }
  }

  const filtered = vendors.filter((v) =>
    v.name.toLowerCase().includes(search.toLowerCase()),
  );

  const allSelected =
    filtered.length > 0 && filtered.every((v) => selectedIds.has(v.id));

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="templateId">Template</Label>
          <Select name="templateId" required>
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
          <Input id="dueDate" name="dueDate" type="date" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="reviewerId">Reviewer</Label>
          <Select name="reviewerId" defaultValue="">
            <SelectTrigger id="reviewerId">
              <SelectValue placeholder="Unassigned" />
            </SelectTrigger>
            <SelectContent>
              {reviewers.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.label}
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
          name="portalPassword"
          placeholder="Shared password for all vendors"
          className="w-72"
        />
      </div>

      <div className="flex items-center gap-2">
        <Input
          placeholder="Filter vendors..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
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
                name="vendorIds"
                value={vendor.id}
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
                  <Badge variant="outline" className="text-[10px]">
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
        <Button
          type="submit"
          disabled={
            isPending || selectedIds.size === 0 || templates.length === 0
          }
        >
          {isPending
            ? "Sending..."
            : `Send to ${selectedIds.size} vendor${selectedIds.size !== 1 ? "s" : ""}`}
        </Button>
        {state?.message ? (
          <p
            className={`text-sm ${state.ok ? "text-[var(--rag-green)]" : "text-destructive"}`}
          >
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
