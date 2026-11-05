"use client";

import { useActionState } from "react";
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
import { Separator } from "@/components/ui/separator";
import { saveStorageSettings } from "./actions";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import type { StorageSettingsView } from "@/lib/settings";

type StorageFormProps = {
  defaults: StorageSettingsView;
};

const initialState: { ok: boolean; message: string } | undefined = undefined;

export function StorageForm({ defaults }: StorageFormProps) {
  const translations = useTranslations("Admin.storage.form");
  const [state, formAction, isPending] = useActionState(
    saveStorageSettings,
    initialState,
  );
  useActionFeedback(state);

  return (
    <form action={formAction} className="grid gap-6">
      <div className="grid gap-4 sm:max-w-md">
        <div className="grid gap-2">
          <Label htmlFor="storage-provider">{translations("provider")}</Label>
          <Select
            key={defaults.provider}
            name="provider"
            defaultValue={defaults.provider}
          >
            <SelectTrigger id="storage-provider">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="local">{translations("local")}</SelectItem>
              <SelectItem value="s3">{translations("s3")}</SelectItem>
              <SelectItem value="azure">{translations("azure")}</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-xs">
            {translations("providerHint")}
          </p>
        </div>
      </div>

      <Separator />

      <div className="grid gap-4 sm:max-w-md">
        <h3 className="text-sm font-medium">{translations("s3Title")}</h3>
        <div className="grid gap-2">
          <Label htmlFor="s3-bucket">{translations("bucket")}</Label>
          <Input
            id="s3-bucket"
            name="s3Bucket"
            defaultValue={defaults.s3Bucket}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="s3-region">{translations("region")}</Label>
          <Input
            id="s3-region"
            name="s3Region"
            defaultValue={defaults.s3Region}
            placeholder={translations("regionPlaceholder")}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="s3-accessKeyId">{translations("accessKeyId")}</Label>
          <Input
            id="s3-accessKeyId"
            name="s3AccessKeyId"
            defaultValue={defaults.s3AccessKeyId}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="s3-secretAccessKey">
            {translations("secretAccessKey")}
          </Label>
          <Input
            id="s3-secretAccessKey"
            name="s3SecretAccessKey"
            type="password"
            defaultValue=""
            placeholder={defaults.s3SecretConfigured ? "········" : ""}
          />
          <p className="text-muted-foreground text-xs">
            {translations("secretHint")}
          </p>
        </div>
      </div>

      <Separator />

      <div className="grid gap-4 sm:max-w-md">
        <h3 className="text-sm font-medium">{translations("azureTitle")}</h3>
        <div className="grid gap-2">
          <Label htmlFor="azure-containerName">
            {translations("containerName")}
          </Label>
          <Input
            id="azure-containerName"
            name="azureContainerName"
            defaultValue={defaults.azureContainerName}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="azure-connectionString">
            {translations("connectionString")}
          </Label>
          <Input
            id="azure-connectionString"
            name="azureConnectionString"
            type="password"
            defaultValue=""
            placeholder={
              defaults.azureConnectionStringConfigured ? "········" : ""
            }
          />
          <p className="text-muted-foreground text-xs">
            {translations("secretHint")}
          </p>
        </div>
      </div>

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? translations("saving") : translations("save")}
      </Button>
    </form>
  );
}
