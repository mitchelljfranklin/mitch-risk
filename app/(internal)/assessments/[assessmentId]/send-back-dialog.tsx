"use client";

import { useTranslations } from "next-intl";

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
  const translations = useTranslations("Assessments.detail.sendBack");
  const formId = `send-back-${assessmentId}`;
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          {translations("trigger")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{translations("title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {translations("description")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form
          id={formId}
          action={sendBackToVendorAction}
          className="grid gap-2"
        >
          <input type="hidden" name="assessmentId" value={assessmentId} />
          <Label htmlFor={`${formId}-message`}>
            {translations("messageLabel")}
          </Label>
          <Textarea
            id={`${formId}-message`}
            name="message"
            placeholder={translations("messagePlaceholder")}
            rows={4}
          />
          <AlertDialogFooter>
            <AlertDialogCancel type="button">
              {translations("cancel")}
            </AlertDialogCancel>
            <SubmitButton type="submit">{translations("confirm")}</SubmitButton>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
