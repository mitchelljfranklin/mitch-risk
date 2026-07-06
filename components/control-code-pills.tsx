"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type ControlCodePillsProps = {
  codes: string[];
};

export function ControlCodePills({ codes }: ControlCodePillsProps) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? codes : codes.slice(0, 3);
  const hiddenCount = codes.length - 3;

  if (codes.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1">
      {visible.map((code) => (
        <Badge key={code} variant="outline" className="font-mono text-xs">
          {code}
        </Badge>
      ))}
      {hiddenCount > 0 && !expanded ? (
        <Button
          variant="link"
          size="sm"
          className="text-muted-foreground h-auto p-0 text-xs"
          onClick={() => setExpanded(true)}
        >
          Show {hiddenCount} more controls
        </Button>
      ) : null}
      {expanded && hiddenCount > 0 ? (
        <Button
          variant="link"
          size="sm"
          className="text-muted-foreground h-auto p-0 text-xs"
          onClick={() => setExpanded(false)}
        >
          Show less
        </Button>
      ) : null}
    </div>
  );
}
