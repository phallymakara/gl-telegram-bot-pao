/**
 * @file Pagination.tsx
 * @description Reusable pagination component for tables and data lists.
 * Supports configurable page size (default 15 records per page) and record count summaries.
 */

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface PaginationProps {
  page: number;
  setPage: (page: number) => void;
  totalPages: number;
  totalRecords?: number;
  pageSize?: number;
}

export default function Pagination({
  page,
  setPage,
  totalPages,
  totalRecords,
  pageSize = 15,
}: PaginationProps) {
  if (totalPages <= 1 && (!totalRecords || totalRecords <= pageSize)) {
    if (totalRecords && totalRecords > 0) {
      return (
        <div className="flex items-center justify-between px-3 py-2.5 text-xs text-slate-500 border-t border-slate-100">
          <span>Showing {totalRecords} {totalRecords === 1 ? "record" : "records"}</span>
        </div>
      );
    }
    return null;
  }

  const startRecord = (page - 1) * pageSize + 1;
  const endRecord =
    totalRecords != null ? Math.min(page * pageSize, totalRecords) : page * pageSize;

  const getPages = (): (number | string)[] => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push("...");
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      if (page < totalPages - 2) pages.push("...");
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-3 py-2.5 border-t border-slate-100 text-xs text-slate-500">
      <div>
        {totalRecords != null ? (
          <span>
            Showing <strong className="font-semibold text-slate-700">{startRecord}</strong> to{" "}
            <strong className="font-semibold text-slate-700">{endRecord}</strong> of{" "}
            <strong className="font-semibold text-slate-700">{totalRecords}</strong> records
          </span>
        ) : (
          <span>
            Page <strong className="font-semibold text-slate-700">{page}</strong> of{" "}
            <strong className="font-semibold text-slate-700">{totalPages}</strong>
          </span>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
          className="h-7 w-7 rounded-lg border border-slate-200 text-slate-500 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Previous page"
        >
          <ChevronLeft size={14} />
        </button>

        {getPages().map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className="px-1 text-slate-400 select-none">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => setPage(p as number)}
              className={`h-7 min-w-[28px] px-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                p === page
                  ? "bg-indigo-600 text-white"
                  : "border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => setPage(page + 1)}
          className="h-7 w-7 rounded-lg border border-slate-200 text-slate-500 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Next page"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
