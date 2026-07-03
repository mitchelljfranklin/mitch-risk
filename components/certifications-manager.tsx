"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  type CertificationActionState,
  deleteCertificationAction,
  saveCertificationAction,
} from "@/lib/actions/certifications";
import {
  CERTIFICATION_STATUS_LABELS,
  CERTIFICATION_STATUS_STYLES,
  certificationStatus,
} from "@/lib/schemas/certification";
import { useFormToast } from "@/hooks/use-form-toast";
import { formatDate } from "@/lib/utils";

export type CertificationView = {
  id: string;
  name: string;
  issuer: string;
  issuedDate: string;
  expiresDate: string;
  notes: string;
};

type EditorTarget = CertificationView | "new";

const initialState: CertificationActionState = undefined;

function CertificationEditor({
  vendorId,
  target,
  onClose,
}: {
  vendorId: string;
  target: EditorTarget;
  onClose: () => void;
}) {
  const isNew = target === "new";
  const cert = isNew ? null : target;
  const [state, formAction, isPending] = useActionState(
    saveCertificationAction,
    initialState,
  );
  useFormToast(state);

  useEffect(() => {
    if (state?.ok) {
      onClose();
    }
  }, [state, onClose]);

  return (
    <SheetContent className="w-full overflow-y-auto sm:max-w-md">
      <SheetHeader>
        <SheetTitle>{isNew ? "Add certification" : cert?.name}</SheetTitle>
        <SheetDescription>
          Track an attestation (SOC 2, ISO 27001, …) and its expiry.
        </SheetDescription>
      </SheetHeader>
      <form action={formAction} className="flex flex-1 flex-col gap-4 px-4">
        <input type="hidden" name="vendorId" value={vendorId} />
        {!isNew ? (
          <input type="hidden" name="certificationId" value={cert?.id} />
        ) : null}
        <div className="grid gap-2">
          <Label htmlFor="cert-name">Name</Label>
          <Input
            id="cert-name"
            name="name"
            defaultValue={cert?.name ?? ""}
            placeholder="e.g. SOC 2 Type II"
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="cert-issuer">Issuer (optional)</Label>
          <Input
            id="cert-issuer"
            name="issuer"
            defaultValue={cert?.issuer ?? ""}
            placeholder="e.g. Auditor / certification body"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="cert-issued">Issued (optional)</Label>
            <Input
              id="cert-issued"
              name="issuedDate"
              type="date"
              defaultValue={cert?.issuedDate ?? ""}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cert-expires">Expires</Label>
            <Input
              id="cert-expires"
              name="expiresDate"
              type="date"
              defaultValue={cert?.expiresDate ?? ""}
              required
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="cert-notes">Notes (optional)</Label>
          <Textarea
            id="cert-notes"
            name="notes"
            defaultValue={cert?.notes ?? ""}
            rows={3}
          />
        </div>
        <SheetFooter className="px-0">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : "Save certification"}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </SheetFooter>
      </form>
    </SheetContent>
  );
}

export function CertificationsManager({
  vendorId,
  certifications,
  canEdit,
}: {
  vendorId: string;
  certifications: CertificationView[];
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState<EditorTarget | null>(null);

  const editingCert =
    editing && editing !== "new"
      ? (certifications.find((cert) => cert.id === editing.id) ?? null)
      : null;
  const isOpen = editing === "new" || editingCert !== null;

  return (
    <div className="flex flex-col gap-3">
      {certifications.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No certifications tracked yet.
        </p>
      ) : (
        <div className="flex flex-col divide-y rounded-lg border">
          {certifications.map((cert) => {
            const status = certificationStatus(cert.expiresDate);
            return (
              <div
                key={cert.id}
                className="flex flex-wrap items-center justify-between gap-2 p-3"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="text-sm font-medium">
                    {cert.name}
                    {cert.issuer ? (
                      <span className="text-muted-foreground text-xs font-normal">
                        {" "}
                        · {cert.issuer}
                      </span>
                    ) : null}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    Expires {formatDate(cert.expiresDate)}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge className={CERTIFICATION_STATUS_STYLES[status]}>
                    {CERTIFICATION_STATUS_LABELS[status]}
                  </Badge>
                  {canEdit ? (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditing(cert)}
                      >
                        Edit
                      </Button>
                      <form
                        id={`delete-cert-${cert.id}`}
                        action={deleteCertificationAction}
                      >
                        <input
                          type="hidden"
                          name="certificationId"
                          value={cert.id}
                        />
                        <ConfirmDialog
                          title="Delete certification?"
                          description={`"${cert.name}" will be permanently removed.`}
                          confirmLabel="Delete"
                          formId={`delete-cert-${cert.id}`}
                        >
                          <Button type="button" size="sm" variant="ghost">
                            Delete
                          </Button>
                        </ConfirmDialog>
                      </form>
                    </>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {canEdit ? (
        <div>
          <Button size="sm" variant="outline" onClick={() => setEditing("new")}>
            Add certification
          </Button>
        </div>
      ) : null}

      <Sheet
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        {isOpen ? (
          <CertificationEditor
            key={editing === "new" ? "new" : (editingCert?.id ?? "new")}
            vendorId={vendorId}
            target={
              editing === "new" ? "new" : (editingCert as CertificationView)
            }
            onClose={() => setEditing(null)}
          />
        ) : null}
      </Sheet>
    </div>
  );
}
