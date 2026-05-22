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
        <thead className="bg-surface text-xs font-semibold uppercase text-muted">
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
            <tr key={row.id} className="bg-panel transition hover:bg-surface/70">
              {row.getVisibleCells().map((cell) => {
                const meta = cell.column.columnDef.meta;
                const align = meta?.align ?? "left";
                return (
                  <td
                    key={cell.id}
                    className={`px-4 py-4 align-top text-ink ${alignClass[align]} ${meta?.cellClassName ?? ""}`}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
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
