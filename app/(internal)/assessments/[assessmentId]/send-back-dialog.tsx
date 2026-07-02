"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
        </form>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            form={formId}
            type="submit"
            className={buttonVariants()}
          >
            Send back
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
