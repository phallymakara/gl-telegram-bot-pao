/**
 * @file Toast.tsx
 * @description Floating notification toast banner component displayed at bottom-right corner upon user actions.
 */

import React from "react";
import { Check, AlertTriangle } from "lucide-react";

export type ToastType = "success" | "error";

interface ToastProps {
  /** Notification message string to display, or null when hidden */
  toast: string | null;
  /** Visual style of the toast: green check for success, red warning for error. Defaults to "success". */
  type?: ToastType;
}

/**
 * Toast notification overlay component.
 */
export default function Toast({ toast, type = "success" }: ToastProps) {
  if (!toast) return null;
  const isError = type === "error";
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div
        className={
          "text-white text-sm px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 max-w-sm " +
          (isError ? "bg-red-600" : "bg-slate-900")
        }
        role={isError ? "alert" : "status"}
      >
        {isError ? (
          <AlertTriangle size={16} className="text-red-100 shrink-0" />
        ) : (
          <Check size={16} className="text-emerald-400 shrink-0" />
        )}
        <span>{toast}</span>
      </div>
    </div>
  );
}
