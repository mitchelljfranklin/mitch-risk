"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

type PaginationProps = {
  page: number;
  pageSize: number;
  totalCount: number;
  pageParam?: string;
  itemLabel?: string;
};

export function Pagination({
  page,
  pageSize,
  totalCount,
  pageParam = "page",
  itemLabel = "items",
}: PaginationProps) {
  const translations = useTranslations("Common.pagination");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  function hrefForPage(targetPage: number): string {
    const params = new URLSearchParams(searchParams.toString());
    params.set(pageParam, String(targetPage));
    return `${pathname}?${params.toString()}`;
  }

  if (totalCount === 0) return null;

  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-muted-foreground text-xs" aria-live="polite">
        {translations("pageOf", {
          page,
          totalPages,
          totalCount,
          itemLabel,
        })}
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Button asChild variant="outline" size="sm">
            <Link href={hrefForPage(page - 1)} rel="prev">
              {translations("previous")}
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            {translations("previous")}
          </Button>
        )}
        {page < totalPages ? (
          <Button asChild variant="outline" size="sm">
            <Link href={hrefForPage(page + 1)} rel="next">
              {translations("next")}
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            {translations("next")}
          </Button>
        )}
      </div>
    </div>
  );
}
