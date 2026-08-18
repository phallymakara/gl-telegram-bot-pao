/**
 * @file Toast.tsx
 * @description Floating notification toast banner component displayed at bottom-right corner upon user actions.
 */

import React from "react";
import { Check } from "lucide-react";

interface ToastProps {
  /** Notification message string to display, or null when hidden */
  toast: string | null;
}

/**
 * Toast notification overlay component.
 */
export default function Toast({ toast }: ToastProps) {
  if (!toast) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="bg-slate-900 text-white text-sm px-4 py-3 rounded-xl shadow-lg flex items-center gap-2">
        <Check size={16} className="text-emerald-400" /> {toast}
      </div>
    </div>
  );
}
