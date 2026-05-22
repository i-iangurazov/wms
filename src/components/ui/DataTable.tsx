"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowData
} from "@tanstack/react-table";
import { Table, TableWrap } from "./Table";

type ColumnAlign = "left" | "center" | "right";

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData extends RowData, TValue> {
    align?: ColumnAlign;
    headerClassName?: string;
    cellClassName?: string;
    minWidth?: string;
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
  className = ""
}: {
  data: TData[];
  columns: ColumnDef<TData, unknown>[];
  getRowId?: (row: TData, index: number) => string;
  className?: string;
}) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId
  });

  return (
    <TableWrap className={className}>
      <Table>
        <thead className="hidden bg-surface text-xs font-semibold uppercase text-muted md:table-header-group">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const meta = header.column.columnDef.meta;
                const align = meta?.align ?? "left";
                return (
                  <th
                    key={header.id}
                    className={`whitespace-nowrap px-4 py-3.5 ${alignClass[align]} ${meta?.headerClassName ?? ""}`}
                    style={meta?.minWidth ? { minWidth: meta.minWidth } : undefined}
                    scope="col"
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-border">
          {table.getRowModel().rows.map((row) => (
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
    </TableWrap>
  );
}
