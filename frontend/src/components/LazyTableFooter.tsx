/**
 * @file LazyTableFooter.tsx
 * @description Standard table footer for progressive lazy loaded tables.
 * Displays "Showing X records" and an animated loading indicator when fetching/loading additional batches.
 */

import React from "react";

export interface LazyTableFooterProps {
  /** Count of currently displayed records */
  currentShown: number;
  /** Total count of records (optional) */
  totalRecords?: number;
  /** Optional loading state (omitted from footer to avoid duplicate loaders) */
  isLoadingMore?: boolean;
}

export default function LazyTableFooter({
  currentShown,
  totalRecords,
}: LazyTableFooterProps) {
  if (totalRecords === 0 || currentShown === 0) return null;

  return (
    <div className="flex items-center justify-between px-3 py-1.5 border-t border-slate-100 text-xs text-slate-500">
      <span>
        Showing <strong className="font-semibold text-slate-700">{currentShown}</strong> records
      </span>
    </div>
  );
}
