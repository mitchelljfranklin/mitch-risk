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
  getSortedRowModel,
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
import { AssessmentStatusBadge } from "@/components/assessment-status-badge";
import { DataTableColumnHeader } from "@/components/data-table-column-header";
import { Pagination } from "@/components/pagination";
import { ScoreBadge } from "@/components/score-badge";
import { type AssessmentSort } from "@/lib/db/assessments";
import { isAssessmentOverdue } from "@/lib/schemas/assessment";
import { formatDate } from "@/lib/utils";

type AssessmentRow = {
  id: string;
  title: string;
  status: string;
  score: number | null;
  dueDate: string | null;
  vendorName: string;
  templateName: string | null;
  templateVersion: number | null;
};

const SORT_KEY_MAP: Record<
  string,
  { asc: AssessmentSort; desc: AssessmentSort }
> = {
  created: { asc: "created-asc", desc: "created" },
  score: { asc: "score-asc", desc: "score-desc" },
  status: { asc: "status", desc: "status" },
  dueDate: { asc: "due-asc", desc: "due-desc" },
};

function sortParamToState(sort: AssessmentSort | undefined): SortingState {
  if (!sort) return [{ id: "created", desc: true }];
  for (const [col, { asc, desc }] of Object.entries(SORT_KEY_MAP)) {
    if (sort === asc) return [{ id: col, desc: false }];
    if (sort === desc) return [{ id: col, desc: true }];
  }
  return [{ id: "created", desc: true }];
}

function stateToSortParam(state: SortingState): AssessmentSort {
  if (state.length === 0) return "created";
  const { id, desc } = state[0];
  const map = SORT_KEY_MAP[id];
  if (!map) return "created";
  return desc ? map.desc : map.asc;
}

const STATUS_ACCENT: Record<string, string> = {
  SUBMITTED: "border-l-[var(--rag-amber)] bg-[var(--rag-amber)]/5",
  UNDER_REVIEW: "border-l-blue-500 bg-blue-50 dark:bg-blue-950/20",
  COMPLETED: "border-l-[var(--rag-green)] bg-[var(--rag-green)]/5",
};

type AssessmentsTableProps = {
  assessments: AssessmentRow[];
  initialSort: AssessmentSort | undefined;
  page: number;
  pageSize: number;
  totalCount: number;
};

export function AssessmentsTable({
  assessments,
  initialSort,
  page,
  pageSize,
  totalCount,
}: AssessmentsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [sorting, setSorting] = useState<SortingState>(() =>
    sortParamToState(initialSort),
  );
  const columns: ColumnDef<AssessmentRow>[] = [
    {
      id: "created",
      enableSorting: true,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Assessment · Vendor" />
      ),
      cell: ({ row }) => {
        const assessment = row.original;
        const overdue = isAssessmentOverdue(
          assessment.dueDate,
          assessment.status,
        );
        return (
          <Link href={`/assessments/${assessment.id}`} className="block">
            <span className="truncate text-sm font-medium">
              {assessment.title}
            </span>
            <span className="text-muted-foreground block truncate text-xs">
              {assessment.vendorName}
              {assessment.templateName
                ? ` · ${assessment.templateName} v${assessment.templateVersion}`
                : ""}
              {assessment.dueDate ? (
                <span className={overdue ? "text-[var(--rag-red)]" : ""}>
                  {` · due ${formatDate(assessment.dueDate)}`}
                </span>
              ) : (
                ""
              )}
            </span>
          </Link>
        );
      },
    },
    {
      id: "score",
      enableSorting: true,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Score" />
      ),
      cell: ({ row }) => {
        const score = row.original.score;
        return score !== null ? <ScoreBadge score={score} size="sm" /> : null;
      },
    },
    {
      id: "status",
      enableSorting: true,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => {
        const assessment = row.original;
        const overdue = isAssessmentOverdue(
          assessment.dueDate,
          assessment.status,
        );
        return (
          <span>
            {overdue ? (
              <Badge variant="destructive" className="mr-1">
                Overdue
              </Badge>
            ) : null}
            <AssessmentStatusBadge status={assessment.status} />
          </span>
        );
      },
    },
    {
      id: "dueDate",
      enableSorting: true,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Due" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">
          {row.original.dueDate ? formatDate(row.original.dueDate) : "—"}
        </span>
      ),
    },
  ];

  const table = useReactTable({
    data: assessments,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
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
            {table.getRowModel().rows.map((row) => {
              const assessment = row.original;
              const overdue = isAssessmentOverdue(
                assessment.dueDate,
                assessment.status,
              );
              const accentClass = overdue
                ? "border-l-destructive border-l-4"
                : (STATUS_ACCENT[assessment.status] ?? "");
              return (
                <TableRow key={row.id} className={accentClass}>
                  {row.getVisibleCells().map((cell) => {
                    const isFirstCol = cell.column.id === "created";
                    return (
                      <TableCell
                        key={cell.id}
                        className={
                          isFirstCol
                            ? "p-3"
                            : "hidden p-3 text-right sm:table-cell"
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
              );
            })}
          </TableBody>
        </Table>
      </div>
      <Pagination
        page={page}
        pageSize={pageSize}
        totalCount={totalCount}
        itemLabel="assessments"
      />
    </div>
  );
}
