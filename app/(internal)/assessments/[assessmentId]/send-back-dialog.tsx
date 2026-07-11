"use client";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { sendBackToVendorAction } from "@/lib/actions/collaboration";

export function SendBackDialog({ assessmentId }: { assessmentId: string }) {
  const formId = `send-back-${assessmentId}`;
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          Send back to vendor
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Send back to vendor?</AlertDialogTitle>
          <AlertDialogDescription>
            The vendor will be able to edit and resubmit their answers, and will
            receive an email with your message. Their existing answers are kept.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form
          id={formId}
          action={sendBackToVendorAction}
          className="grid gap-2"
        >
          <input type="hidden" name="assessmentId" value={assessmentId} />
          <Label htmlFor={`${formId}-message`}>
            Message to the vendor (optional)
          </Label>
          <Textarea
            id={`${formId}-message`}
            name="message"
            placeholder="Explain what additional information is needed…"
            rows={4}
          />
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
            <SubmitButton type="submit">Send back</SubmitButton>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
