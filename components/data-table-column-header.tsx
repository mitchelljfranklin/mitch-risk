"use client";

import {
  type Column,
  type RowData,
  type StockFeatures,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DataTableColumnHeaderProps<TData extends RowData, TValue> = {
  column: Column<StockFeatures, TData, TValue>;
  title: string;
  className?: string;
};

export function DataTableColumnHeader<TData extends RowData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>;
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("-ml-3 h-8", className)}
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      <span>{title}</span>
      {column.getIsSorted() === "desc" ? (
        <ArrowDown className="ml-1 size-3.5" />
      ) : column.getIsSorted() === "asc" ? (
        <ArrowUp className="ml-1 size-3.5" />
      ) : (
        <ChevronsUpDown className="text-muted-foreground ml-1 size-3.5 opacity-50" />
      )}
    </Button>
  );
}
