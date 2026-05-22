"use client";

import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
  type RowData,
  type SortingState
} from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { ChevronDown, ChevronsUpDown, ChevronUp } from "lucide-react";
import { Button } from "./Button";
import { Table, TableWrap } from "./Table";

type ColumnAlign = "left" | "center" | "right";

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData extends RowData, TValue> {
    align?: ColumnAlign;
    headerClassName?: string;
    cellClassName?: string;
    minWidth?: string;
    sortValue?: (row: TData) => string | number | null | undefined;
  }
}

const alignClass: Record<ColumnAlign, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right"
};

export function DataTable<TData>({
  data,
  columns,
  getRowId,
  className = "",
  pageSize = 20
}: {
  data: TData[];
  columns: ColumnDef<TData, unknown>[];
  getRowId?: (row: TData, index: number) => string;
  className?: string;
  pageSize?: number;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const sortedData = useMemo(() => {
    const activeSort = sorting[0];
    if (!activeSort) {
      return data;
    }
    const column = columns.find((item) => item.id === activeSort.id);
    const sortValue = column?.meta?.sortValue;
    if (!sortValue) {
      return data;
    }
    return [...data].sort((left, right) => {
      const leftValue = sortValue(left);
      const rightValue = sortValue(right);
      if (leftValue === rightValue) {
        return 0;
      }
      if (leftValue === null || leftValue === undefined) {
        return activeSort.desc ? 1 : -1;
      }
      if (rightValue === null || rightValue === undefined) {
        return activeSort.desc ? -1 : 1;
      }
      const result =
        typeof leftValue === "number" && typeof rightValue === "number"
          ? leftValue - rightValue
          : String(leftValue).localeCompare(String(rightValue), "ru", { numeric: true, sensitivity: "base" });
      return activeSort.desc ? -result : result;
    });
  }, [columns, data, sorting]);

  const table = useReactTable({
    data: sortedData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId,
    initialState: { pagination: { pageSize } }
  });
  const rows = table.getRowModel().rows;
  const pageStart = data.length === 0 ? 0 : table.getState().pagination.pageIndex * pageSize + 1;
  const pageEnd = Math.min(pageStart + rows.length - 1, data.length);

  return (
    <TableWrap className={className}>
      <Table>
        <thead className="hidden bg-surface text-xs font-semibold uppercase text-muted md:table-header-group">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const meta = header.column.columnDef.meta;
                const align = meta?.align ?? "left";
                const sortId = header.column.id;
                const activeSort = sorting.find((item) => item.id === sortId);
                const canSort = Boolean(meta?.sortValue);
                const SortIcon = !activeSort ? ChevronsUpDown : activeSort.desc ? ChevronDown : ChevronUp;
                return (
                  <th
                    key={header.id}
                    className={`whitespace-nowrap px-4 py-3.5 ${alignClass[align]} ${meta?.headerClassName ?? ""}`}
                    style={meta?.minWidth ? { minWidth: meta.minWidth } : undefined}
                    scope="col"
                  >
                    {header.isPlaceholder ? null : canSort ? (
                      <button
                        className={`inline-flex items-center gap-1.5 rounded-md text-xs font-semibold uppercase hover:text-ink ${align === "right" ? "ml-auto" : ""}`}
                        type="button"
                        onClick={() =>
                          setSorting((current) => {
                            const existing = current[0];
                            if (!existing || existing.id !== sortId) {
                              return [{ id: sortId, desc: false }];
                            }
                            if (!existing.desc) {
                              return [{ id: sortId, desc: true }];
                            }
                            return [];
                          })
                        }
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <SortIcon className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr key={row.id} className="block bg-panel p-3 transition hover:bg-surface/70 md:table-row md:p-0">
              {row.getVisibleCells().map((cell) => {
                const meta = cell.column.columnDef.meta;
                const align = meta?.align ?? "left";
                const headerLabel =
                  typeof cell.column.columnDef.header === "string"
                    ? cell.column.columnDef.header
                    : cell.column.id;
                return (
                  <td
                    key={cell.id}
                    className={`flex items-start justify-between gap-4 px-1 py-2 align-top text-ink md:table-cell md:px-4 md:py-4 ${alignClass[align]} ${meta?.cellClassName ?? ""}`}
                  >
                    <span className="max-w-28 shrink-0 text-left text-xs font-semibold uppercase text-muted md:hidden">
                      {headerLabel}
                    </span>
                    <div className={align === "right" ? "min-w-0 text-right" : "min-w-0"}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </Table>
      {data.length > pageSize ? (
        <div className="flex flex-col gap-3 border-t border-border bg-panel px-4 py-3 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <div>
            Показано {pageStart}-{pageEnd} из {data.length}
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              type="button"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
            >
              Назад
            </Button>
            <Button
              variant="secondary"
              type="button"
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
            >
              Далее
            </Button>
          </div>
        </div>
      ) : null}
    </TableWrap>
  );
}
