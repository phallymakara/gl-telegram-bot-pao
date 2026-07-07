import React from "react";

interface PaginationProps {
  page: number;
  setPage: (page: number) => void;
  totalPages: number;
}

export default function Pagination({ page, setPage, totalPages }: PaginationProps) {
  if (totalPages <= 1) return null;
  const pages: (number | string)[] = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p <= 5 || p === totalPages) {
      pages.push(p);
    } else if (pages[pages.length - 1] !== "...") {
      pages.push("...");
    }
  }
  return (
    <div className="flex items-center gap-1.5">
      <button
        disabled={page === 1}
        onClick={() => setPage(page - 1)}
        className="h-8 w-8 rounded-lg border border-slate-200 text-slate-500 disabled:opacity-40 hover:bg-slate-50 flex items-center justify-center"
      >
        ←
      </button>
      {pages.map((p, i) =>
        p === "..." ? (
          <span key={i} className="px-1 text-slate-400 text-sm">…</span>
        ) : (
          <button
            key={i}
            onClick={() => setPage(p as number)}
            className={`h-8 w-8 rounded-lg text-sm font-medium ${
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
        disabled={page === totalPages}
        onClick={() => setPage(page + 1)}
        className="h-8 w-8 rounded-lg border border-slate-200 text-slate-500 disabled:opacity-40 hover:bg-slate-50 flex items-center justify-center"
      >
        →
      </button>
    </div>
  );
}
