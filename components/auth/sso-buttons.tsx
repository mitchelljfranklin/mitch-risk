"use client";

import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";

type SsoButtonsProps = {
  providers: { id: string; label: string }[];
};

export function SsoButtons({ providers }: SsoButtonsProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-muted-foreground text-xs">or sign in with</p>
      <div className="flex flex-col gap-2">
        {providers.map((provider) => (
          <Button
            key={provider.id}
            variant="outline"
            type="button"
            onClick={() => signIn(provider.id)}
          >
            {provider.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
