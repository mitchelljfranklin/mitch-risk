"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTableColumnHeader } from "@/components/data-table-column-header";
import { Pagination } from "@/components/pagination";
import { ScoreBadge } from "@/components/score-badge";
import { type VendorSort } from "@/lib/db/vendors";
import { VENDOR_TIER_LABELS } from "@/lib/schemas/vendor";

type VendorRow = {
  id: string;
  name: string;
  contactEmail: string;
  tier: string | null;
  overallScore: number | null;
};

const SORT_KEY_MAP: Record<string, { asc: VendorSort; desc: VendorSort }> = {
  name: { asc: "name", desc: "name-desc" },
  score: { asc: "score-asc", desc: "score-desc" },
  tier: { asc: "tier", desc: "tier" },
};

function sortParamToState(sort: VendorSort | undefined): SortingState {
  if (!sort) return [{ id: "name", desc: false }];
  for (const [col, { asc, desc }] of Object.entries(SORT_KEY_MAP)) {
    if (sort === asc) return [{ id: col, desc: false }];
    if (sort === desc) return [{ id: col, desc: true }];
  }
  return [{ id: "name", desc: false }];
}

function stateToSortParam(state: SortingState): VendorSort {
  if (state.length === 0) return "name";
  const { id, desc } = state[0];
  const map = SORT_KEY_MAP[id];
  if (!map) return "name";
  return desc ? map.desc : map.asc;
}

type VendorsTableProps = {
  vendors: VendorRow[];
  initialSort: VendorSort | undefined;
  page: number;
  pageSize: number;
  totalCount: number;
};

export function VendorsTable({
  vendors,
  initialSort,
  page,
  pageSize,
  totalCount,
}: VendorsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [sorting, setSorting] = useState<SortingState>(() =>
    sortParamToState(initialSort),
  );

  const columns: ColumnDef<VendorRow>[] = [
    {
      id: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Vendor" />
      ),
      cell: ({ row }) => {
        const vendor = row.original;
        return (
          <Link href={`/vendors/${vendor.id}`} className="block">
            <span className="truncate text-sm font-medium">{vendor.name}</span>
            <span className="text-muted-foreground block truncate text-xs">
              {vendor.contactEmail}
            </span>
          </Link>
        );
      },
    },
    {
      id: "tier",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Tier" />
      ),
      cell: ({ row }) => {
        const tier = row.original.tier;
        return tier ? (
          <Badge variant="outline">
            {VENDOR_TIER_LABELS[tier as keyof typeof VENDOR_TIER_LABELS]}
          </Badge>
        ) : null;
      },
    },
    {
      id: "score",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Score" />
      ),
      cell: ({ row }) => (
        <ScoreBadge score={row.original.overallScore} size="sm" />
      ),
    },
  ];

  const table = useReactTable({
    data: vendors,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualSorting: true,
    manualPagination: true,
    onSortingChange: (updater) => {
      setSorting((previous) => {
        const next =
          typeof updater === "function" ? updater(previous) : updater;
        const params = new URLSearchParams(searchParams.toString());
        if (next.length === 0) {
          params.delete("sort");
        } else {
          params.set("sort", stateToSortParam(next));
        }
        params.delete("page");
        router.replace(`?${params.toString()}`, { scroll: false });
        return next;
      });
    },
    state: {
      sorting,
      pagination: { pageIndex: page - 1, pageSize },
    },
    pageCount: Math.max(1, Math.ceil(totalCount / pageSize)),
  });

  return (
    <div>
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => {
                  const isFirstCol = cell.column.id === "name";
                  return (
                    <TableCell
                      key={cell.id}
                      className={
                        isFirstCol ? "p-3" : "hidden p-3 md:table-cell"
                      }
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="mt-4">
        <Pagination
          page={page}
          pageSize={pageSize}
          totalCount={totalCount}
          itemLabel="vendors"
        />
      </div>
    </div>
  );
}
