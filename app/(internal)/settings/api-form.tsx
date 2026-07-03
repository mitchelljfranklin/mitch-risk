"use client";

import { useActionState, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFormToast } from "@/hooks/use-form-toast";
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

type ApiKeyRow = {
  id: string;
  name: string;
  prefix: string;
  disabled: boolean;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  allowedIps: string;
  rateLimitPerMin: number | null;
  createdAt: Date;
};

type ApiFormProps = {
  enabled: boolean;
  keys: ApiKeyRow[];
};

export function ApiForm({ enabled, keys }: ApiFormProps) {
  const [showNewKey, setShowNewKey] = useState<string | null>(null);
  const [createState, createAction, createPending] = useActionState(
    (
      prev: { ok: boolean; message: string; key?: string } | undefined,
      data: FormData,
    ) => {
      const result = createApiKeyAction(prev, data);
      void result.then((r) => {
        if (r?.key) setShowNewKey(r.key);
      });
      return result;
    },
    undefined,
  );
  const [saveState, saveAction, savePending] = useActionState(
    saveApiSettingsAction,
    undefined,
  );
  useFormToast(saveState);

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
          <Label htmlFor="apiEnabled">Enable API key authentication</Label>
        </div>
        <p className="text-muted-foreground text-xs">
          API keys allow external tools to call the REST API without a browser
          login. Keys have full access to every endpoint and remain valid
          independently of the account that created them. Keys are shown only
          once and cannot be retrieved later.
        </p>
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={savePending} size="sm">
            {savePending ? "Saving..." : "Save"}
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href="/docs" target="_blank" rel="noopener noreferrer">
              API documentation →
            </a>
          </Button>
        </div>
      </form>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">API keys ({keys.length})</h3>
        </div>

        {showNewKey ? (
          <div className="rounded-md border border-green-300 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/30">
            <p className="text-sm font-semibold text-green-800 dark:text-green-200">
              Key created — copy it now
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              This key will not be shown again. Store it securely.
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
                Copy
              </Button>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() => setShowNewKey(null)}
            >
              Done
            </Button>
          </div>
        ) : null}

        <form
          action={createAction}
          className="flex flex-col gap-3 rounded-md border p-4"
        >
          <h4 className="text-sm font-medium">Create new key</h4>
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="keyName" className="text-xs">
                Name
              </Label>
              <Input
                id="keyName"
                name="name"
                placeholder="e.g. CI pipeline"
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="expiresIn" className="text-xs">
                Expiry
              </Label>
              <Select name="expiresIn" defaultValue="90">
                <SelectTrigger id="expiresIn" className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                  <SelectItem value="180">180 days</SelectItem>
                  <SelectItem value="365">1 year</SelectItem>
                  <SelectItem value="permanent">Permanent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="allowedIps" className="text-xs">
                Allowed IPs (optional)
              </Label>
              <Input
                id="allowedIps"
                name="allowedIps"
                placeholder="192.168.1.0/24"
                className="text-xs"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="rateLimit" className="text-xs">
                Rate limit/min
              </Label>
              <Input
                id="rateLimit"
                name="rateLimit"
                type="number"
                min={1}
                placeholder="Default"
                className="text-xs"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" size="sm" disabled={createPending}>
              {createPending ? "Creating..." : "Create key"}
            </Button>
          </div>
        </form>

        {keys.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No API keys created yet.
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
                    {key.disabled ? (
                      <Badge variant="destructive" className="text-[10px]">
                        Revoked
                      </Badge>
                    ) : key.expiresAt && key.expiresAt < new Date() ? (
                      <Badge variant="destructive" className="text-[10px]">
                        Expired
                      </Badge>
                    ) : null}
                  </div>
                  <span className="text-muted-foreground text-xs">
                    {key.lastUsedAt
                      ? `Last used ${new Date(key.lastUsedAt).toLocaleString()}`
                      : "Never used"}
                    {key.allowedIps
                      ? ` · IPs: ${key.allowedIps.replace(/\n/g, ", ")}`
                      : ""}
                    {key.rateLimitPerMin
                      ? ` · Rate limit: ${key.rateLimitPerMin}/min`
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
                        Enable
                      </Button>
                    ) : (
                      <ConfirmDialog
                        title="Revoke API key?"
                        description={`Any integrations using "${key.name}" will stop working immediately. This can be re-enabled later.`}
                        confirmLabel="Revoke"
                        formId={`toggle-key-${key.id}`}
                      >
                        <Button type="button" size="sm" variant="ghost">
                          Revoke
                        </Button>
                      </ConfirmDialog>
                    )}
                  </form>
                  <form id={`delete-key-${key.id}`} action={deleteApiKeyAction}>
                    <input type="hidden" name="keyId" value={key.id} />
                    <ConfirmDialog
                      title="Delete API key?"
                      description={`"${key.name}" will be permanently deleted. Any integrations using this key will break permanently. This cannot be undone.`}
                      formId={`delete-key-${key.id}`}
                    >
                      <Button type="button" size="sm" variant="ghost">
                        Delete
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
