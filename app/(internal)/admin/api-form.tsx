"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createApiKeyAction,
  deleteApiKeyAction,
  saveApiSettingsAction,
  toggleApiKeyAction,
} from "./actions";
import { PermissionSelector } from "@/components/permission-selector";

type ApiKeyRow = {
  id: string;
  name: string;
  prefix: string;
  disabled: boolean;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  requestCount: number;
  allowedIps: string;
  rateLimitPerMin: number | null;
  permissions: string[];
  createdAt: Date;
};

type ApiFormProps = {
  enabled: boolean;
  keys: ApiKeyRow[];
};

export function ApiForm({ enabled, keys }: ApiFormProps) {
  const router = useRouter();
  const translations = useTranslations("Admin.api");
  const dateFormatter = useFormatter();
  const [showNewKey, setShowNewKey] = useState<string | null>(null);
  const [, createAction, createPending] = useActionState(
    (
      prev: { ok: boolean; message: string; key?: string } | undefined,
      data: FormData,
    ) => {
      const result = createApiKeyAction(prev, data);
      // Read the one-time key and refresh the list from the resolved action
      // promise (not a revalidatePath in the action, which would drop the
      // returned key in production). This runs after the result is applied.
      void result.then((resolved) => {
        if (resolved?.ok) {
          if (resolved.key) setShowNewKey(resolved.key);
          router.refresh();
        }
      });
      return result;
    },
    undefined,
  );
  const [saveState, saveAction, savePending] = useActionState(
    saveApiSettingsAction,
    undefined,
  );
  useActionFeedback(saveState);

  return (
    <div className="flex flex-col gap-6">
      <form action={saveAction} className="grid gap-4">
        <div className="flex items-center gap-3">
          <Checkbox
            key={String(enabled)}
            id="apiEnabled"
            name="enabled"
            defaultChecked={enabled}
          />
          <Label htmlFor="apiEnabled">{translations("enabled")}</Label>
        </div>
        <p className="text-muted-foreground text-xs">
          {translations("enabledHint")}
        </p>
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={savePending} size="sm">
            {savePending ? translations("saving") : translations("save")}
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href="/docs" target="_blank" rel="noopener noreferrer">
              {translations("docs")}
            </a>
          </Button>
        </div>
      </form>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">
            {translations("keysTitle", { count: keys.length })}
          </h3>
        </div>

        {showNewKey ? (
          <div className="border-success/30 bg-success/10 rounded-md border p-4">
            <p className="text-success text-sm font-semibold">
              {translations("keyCreatedTitle")}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              {translations("keyCreatedHint")}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <code className="bg-background rounded border px-3 py-1.5 font-mono text-xs break-all">
                {showNewKey}
              </code>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  navigator.clipboard.writeText(showNewKey);
                }}
              >
                {translations("copy")}
              </Button>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() => setShowNewKey(null)}
            >
              {translations("done")}
            </Button>
          </div>
        ) : null}

        <form
          action={createAction}
          className="flex flex-col gap-3 rounded-md border p-4"
        >
          <h4 className="text-sm font-medium">{translations("createTitle")}</h4>
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="keyName" className="text-xs">
                {translations("name")}
              </Label>
              <Input
                id="keyName"
                name="name"
                placeholder={translations("namePlaceholder")}
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="expiresIn" className="text-xs">
                {translations("expiry")}
              </Label>
              <Select name="expiresIn" defaultValue="90">
                <SelectTrigger id="expiresIn" className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">
                    {translations("expiryOptions.30")}
                  </SelectItem>
                  <SelectItem value="90">
                    {translations("expiryOptions.90")}
                  </SelectItem>
                  <SelectItem value="180">
                    {translations("expiryOptions.180")}
                  </SelectItem>
                  <SelectItem value="365">
                    {translations("expiryOptions.365")}
                  </SelectItem>
                  <SelectItem value="permanent">
                    {translations("expiryOptions.permanent")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="allowedIps" className="text-xs">
                {translations("allowedIps")}
              </Label>
              <Input
                id="allowedIps"
                name="allowedIps"
                placeholder={translations("allowedIpsPlaceholder")}
                className="text-xs"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="rateLimit" className="text-xs">
                {translations("rateLimit")}
              </Label>
              <Input
                id="rateLimit"
                name="rateLimit"
                type="number"
                min={1}
                placeholder={translations("rateLimitPlaceholder")}
                className="text-xs"
              />
            </div>
          </div>
          <PermissionSelector />
          <div className="flex items-center gap-3">
            <Button type="submit" size="sm" disabled={createPending}>
              {createPending
                ? translations("creating")
                : translations("create")}
            </Button>
          </div>
        </form>

        {keys.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {translations("empty")}
          </p>
        ) : (
          <div className="flex flex-col divide-y rounded-lg border">
            {keys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between gap-3 p-3"
              >
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-xs">{key.prefix}</code>
                    <span className="text-sm font-medium">{key.name}</span>
                    {key.permissions && key.permissions.length > 0 ? (
                      <Badge
                        variant="secondary"
                        className="text-xs"
                        title={key.permissions.join(", ")}
                      >
                        {translations("permissionCount", {
                          count: key.permissions.length,
                        })}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        {translations("fullAccess")}
                      </Badge>
                    )}
                    {key.disabled ? (
                      <Badge variant="destructive" className="text-xs">
                        {translations("revoked")}
                      </Badge>
                    ) : key.expiresAt && key.expiresAt < new Date() ? (
                      <Badge variant="destructive" className="text-xs">
                        {translations("expired")}
                      </Badge>
                    ) : null}
                  </div>
                  <span className="text-muted-foreground text-xs">
                    {key.lastUsedAt
                      ? translations("lastUsed", {
                          date: dateFormatter.dateTime(
                            new Date(key.lastUsedAt),
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          ),
                        })
                      : translations("neverUsed")}
                    {key.requestCount > 0
                      ? ` · ${translations("requestCount", {
                          count: key.requestCount,
                        })}`
                      : ""}
                    {key.allowedIps
                      ? ` · ${translations("ips", {
                          ips: key.allowedIps.replace(/\n/g, ", "),
                        })}`
                      : ""}
                    {key.rateLimitPerMin
                      ? ` · ${translations("rateLimitSuffix", {
                          value: key.rateLimitPerMin,
                        })}`
                      : ""}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <form id={`toggle-key-${key.id}`} action={toggleApiKeyAction}>
                    <input type="hidden" name="keyId" value={key.id} />
                    <input
                      type="hidden"
                      name="disabled"
                      value={key.disabled ? "false" : "true"}
                    />
                    {key.disabled ? (
                      <Button type="submit" size="sm" variant="ghost">
                        {translations("enable")}
                      </Button>
                    ) : (
                      <ConfirmDialog
                        title={translations("revokeTitle")}
                        description={translations("revokeDescription", {
                          name: key.name,
                        })}
                        confirmLabel={translations("revoke")}
                        formId={`toggle-key-${key.id}`}
                      >
                        <Button type="button" size="sm" variant="ghost">
                          {translations("revoke")}
                        </Button>
                      </ConfirmDialog>
                    )}
                  </form>
                  <form id={`delete-key-${key.id}`} action={deleteApiKeyAction}>
                    <input type="hidden" name="keyId" value={key.id} />
                    <ConfirmDialog
                      title={translations("deleteTitle")}
                      description={translations("deleteDescription", {
                        name: key.name,
                      })}
                      formId={`delete-key-${key.id}`}
                    >
                      <Button type="button" size="sm" variant="ghost">
                        {translations("delete")}
                      </Button>
                    </ConfirmDialog>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
