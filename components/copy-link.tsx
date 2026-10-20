"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CopyLink({ value }: { value: string }) {
  const translations = useTranslations("Common.copyLink");
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Input readOnly value={value} className="font-mono text-xs" />
      <Button type="button" variant="outline" onClick={copy}>
        {copied ? translations("copied") : translations("copy")}
      </Button>
    </div>
  );
}
