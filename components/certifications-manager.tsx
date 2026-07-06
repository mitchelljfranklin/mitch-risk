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
  removeAttachmentAction,
  saveCertificationAction,
} from "@/lib/actions/certifications";
import {
  CERTIFICATION_STATUS_LABELS,
  CERTIFICATION_STATUS_STYLES,
  certificationStatus,
} from "@/lib/schemas/certification";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { formatDate } from "@/lib/utils";
import { Trash2 } from "lucide-react";

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
  attachments,
  onClose,
}: {
  vendorId: string;
  target: EditorTarget;
  attachments?: { id: string; fileName: string }[];
  onClose: () => void;
}) {
  const isNew = target === "new";
  const cert = isNew ? null : target;
  const [state, formAction, isPending] = useActionState(
    saveCertificationAction,
    initialState,
  );
  useActionFeedback(state);

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
        <div className="grid gap-2">
          {attachments && attachments.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium">Attachments</span>
              {attachments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-2 rounded-md border p-2"
                >
                  <a
                    href={`/api/attachments/${a.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary truncate text-xs hover:underline"
                  >
                    {a.fileName} ↗
                  </a>
                  <form action={removeAttachmentAction}>
                    <input type="hidden" name="attachmentId" value={a.id} />
                    <Button
                      type="submit"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </form>
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="cert-file">Attachment (optional)</Label>
          <Input
            id="cert-file"
            name="attachmentFile"
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx"
          />
          <p className="text-muted-foreground text-xs">
            Upload a certificate, report, or contract. Max 20 MB.
          </p>
        </div>
        <SheetFooter className="px-0">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : "Save certification"}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
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
  attachments,
  canEdit,
}: {
  vendorId: string;
  certifications: CertificationView[];
  attachments: Map<string, { id: string; fileName: string }[]>;
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
            const certAttachments = attachments.get(cert.id) ?? [];
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
                  {certAttachments.map((a) => (
                    <a
                      key={a.id}
                      href={`/api/attachments/${a.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary mt-0.5 text-xs hover:underline"
                    >
                      {a.fileName} ↗
                    </a>
                  ))}
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
            attachments={
              editing === "new"
                ? undefined
                : editingCert
                  ? (attachments.get(editingCert.id) ?? [])
                  : []
            }
            onClose={() => setEditing(null)}
          />
        ) : null}
      </Sheet>
    </div>
  );
}
