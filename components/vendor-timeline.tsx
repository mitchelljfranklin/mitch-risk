"use client";

import Link from "next/link";
import {
  ClipboardCheck,
  FileBadge,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

import { formatDate } from "@/lib/utils";

type TimelineEvent = {
  id: string;
  type: "assessment" | "finding" | "certification";
  action: string;
  description: string;
  createdAt: Date;
  link?: string;
};

const ICONS: Record<TimelineEvent["type"], LucideIcon> = {
  assessment: ClipboardCheck,
  finding: FileBadge,
  certification: ShieldCheck,
};

const ICON_COLORS: Record<TimelineEvent["type"], string> = {
  assessment: "text-primary",
  finding: "text-[var(--rag-red)]",
  certification: "text-[var(--rag-green)]",
};

export function VendorTimeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No activity recorded yet.</p>
    );
  }

  return (
    <div className="relative flex flex-col gap-0">
      {events.map((event, index) => {
        const Icon = ICONS[event.type];

        return (
          <div key={event.id} className="relative flex gap-3 pb-4">
            {index < events.length - 1 ? (
              <div className="bg-border absolute top-6 left-[11px] h-full w-px" />
            ) : null}

            <div
              className={`relative z-10 mt-0.5 flex size-[23px] shrink-0 items-center justify-center rounded-full border ${ICON_COLORS[event.type]} bg-background`}
            >
              <Icon className="size-3" />
            </div>

            <div className="flex min-w-0 flex-col gap-0.5 pt-0.5">
              <span className="text-xs font-medium">{event.action}</span>
              <span className="text-muted-foreground truncate text-xs">
                {event.link ? (
                  <Link
                    href={event.link}
                    className="hover:text-primary hover:underline"
                  >
                    {event.description}
                  </Link>
                ) : (
                  event.description
                )}
              </span>
              <span className="text-muted-foreground/60 text-[11px]">
                {formatDate(event.createdAt)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
