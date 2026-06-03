"use client";

import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  ColumnDef,
  SortingState,
} from "@tanstack/react-table";
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PreviewData {
  columns: string[];
  rows: Record<string, unknown>[];
  total_rows?: number;
}

interface DataPreviewTableProps {
  preview?: PreviewData;
  isLoading?: boolean;
  datasetName?: string;
  rowCount?: number | null;
}

function TableSkeleton() {
  return (
    <div className="animate-pulse p-4">
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {Array.from({ length: 5 }).map((_, i) => (
                <th key={i} className="px-4 py-3">
                  <div className="h-4 bg-gray-200 rounded w-20" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 8 }).map((_, r) => (
              <tr key={r} className="border-t border-gray-100">
                {Array.from({ length: 5 }).map((_, c) => (
                  <td key={c} className="px-4 py-3">
                    <div className="h-3 bg-gray-100 rounded" style={{ width: `${50 + c * 10}%` }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function DataPreviewTable({ preview, isLoading, rowCount }: DataPreviewTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = preview?.columns ?? [];
  const rows = preview?.rows ?? [];
  const totalRows = preview?.total_rows ?? rowCount ?? undefined;

  const tableCols = useMemo<ColumnDef<Record<string, unknown>>[]>(
    () =>
      columns.map((col) => ({
        id: col,
        accessorKey: col,
        header: col,
        cell: ({ getValue }) => {
          const val = getValue();
          if (val === null || val === undefined) {
            return <span className="text-gray-300 italic text-xs">null</span>;
          }
          const str = String(val);
          return str.length > 80 ? (
            <span title={str}>{str.slice(0, 80)}…</span>
          ) : (
            <>{str}</>
          );
        },
      })),
    [columns]
  );

  const table = useReactTable({
    data: rows,
    columns: tableCols,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 15 } },
  });

  if (isLoading) return <TableSkeleton />;

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400 px-4">
        <div className="text-5xl mb-4">📭</div>
        <p className="font-medium text-gray-500">Aucune donnée disponible</p>
        <p className="text-sm mt-1 text-center">
          {columns.length > 0
            ? `${columns.length} colonne(s) détectée(s) — importez un fichier pour voir les données.`
            : "Importez un fichier CSV ou XLSX pour prévisualiser les données."}
        </p>
        {columns.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2 max-w-lg justify-center">
            {columns.map((col) => (
              <span key={col} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                {col}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  const { pageIndex, pageSize } = table.getState().pagination;
  const from = pageIndex * pageSize + 1;
  const to = Math.min((pageIndex + 1) * pageSize, rows.length);

  return (
    <div className="space-y-3 p-4">
      {totalRows && totalRows > rows.length && (
        <p className="text-xs text-gray-500">
          Aperçu des {rows.length} premières lignes sur{" "}
          <strong>{totalRows.toLocaleString("fr-FR")}</strong> au total.
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-faso-navy text-white">
              {table.getHeaderGroups()[0]?.headers.map((header) => (
                <th
                  key={header.id}
                  className={cn(
                    "px-4 py-3 text-left font-medium whitespace-nowrap select-none",
                    header.column.getCanSort() &&
                      "cursor-pointer hover:bg-white/10 transition-colors"
                  )}
                  onClick={header.column.getToggleSortingHandler()}
                >
                  <div className="flex items-center gap-1.5">
                    <span>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </span>
                    {header.column.getCanSort() && (
                      <span className="opacity-60">
                        {header.column.getIsSorted() === "asc" ? (
                          <ChevronUp size={14} />
                        ) : header.column.getIsSorted() === "desc" ? (
                          <ChevronDown size={14} />
                        ) : (
                          <ChevronsUpDown size={14} />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row, i) => (
              <tr
                key={row.id}
                className={cn(
                  "border-t border-gray-100 transition-colors",
                  i % 2 === 0 ? "bg-white" : "bg-gray-50/50",
                  "hover:bg-blue-50/50"
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="px-4 py-2.5 text-gray-700 whitespace-nowrap max-w-[200px] overflow-hidden text-ellipsis"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            Lignes {from}–{to} sur {rows.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: Math.min(table.getPageCount(), 7) }, (_, i) => i).map((pg) => (
              <button
                key={pg}
                onClick={() => table.setPageIndex(pg)}
                className={cn(
                  "w-7 h-7 rounded text-xs font-medium",
                  pageIndex === pg ? "bg-faso-navy text-white" : "hover:bg-gray-100"
                )}
              >
                {pg + 1}
              </button>
            ))}
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
