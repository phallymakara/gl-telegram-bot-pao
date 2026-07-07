import React from "react";

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const map: Record<string, string> = {
    Completed: "bg-emerald-50 text-emerald-700",
    Active: "bg-emerald-50 text-emerald-700",
    Confirmed: "bg-blue-50 text-blue-700",
    Pending: "bg-amber-50 text-amber-700",
    Scheduled: "bg-blue-50 text-blue-700",
    Cancelled: "bg-slate-100 text-slate-500",
    Paused: "bg-amber-50 text-amber-700",
    Inactive: "bg-rose-50 text-rose-700",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${map[status] || "bg-slate-100 text-slate-600"}`}>
      {status}
    </span>
  );
}
