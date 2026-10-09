/**
 * @file Loader.tsx
 * @description Standardized loader component utilizing the custom geometric shifting animation.
 * Used across the system for React lazy loading fallbacks, page loading states, table data fetches,
 * and inline action states.
 */

import React from "react";

export interface LoaderProps {
  /** Size variant: "sm" (32px), "md" (52px), "lg" (80px) */
  size?: "sm" | "md" | "lg";
  /** Optional custom color override (default: #4f46e5 / indigo-600) */
  color?: string;
  /** Optional loading label displayed beneath the loader */
  text?: string;
  /** Optional additional CSS class names */
  className?: string;
}

/**
 * Core animated loader component.
 */
export default function Loader({
  size = "md",
  color,
  text,
  className = "",
}: LoaderProps) {
  const sizeClass = size === "sm" ? "loader-sm" : size === "lg" ? "loader-lg" : "loader-md";
  const customStyle: React.CSSProperties = color
    ? ({ "--loader-color": color } as React.CSSProperties)
    : {};

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div className={`loader ${sizeClass}`} style={customStyle} />
      {text && <span className="text-xs font-medium text-slate-500 animate-pulse">{text}</span>}
    </div>
  );
}

/**
 * Full page / route suspense fallback loader for React.lazy page transitions.
 * Centered in the middle with no outer container box or background.
 */
export function PageLoader({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex-1 w-full h-full min-h-[400px] flex items-center justify-center p-8">
      <Loader size="md" text={text} />
    </div>
  );
}

/**
 * Standard table loading row used during data queries.
 * Supports:
 * - position="middle": positioned in the middle center of the table data (for initial visits)
 * - position="bottom": positioned at the bottom center of the table (for infinite scroll load more)
 */
export function TableLoader({
  colSpan = 8,
  text = "Loading data...",
  className = "",
  size = "md",
  position = "middle",
}: {
  colSpan?: number;
  text?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  position?: "middle" | "bottom";
}) {
  const pyClass = position === "bottom" ? "py-4" : "py-24";
  return (
    <tr className={className}>
      <td colSpan={colSpan} className={`${pyClass} px-4 text-center`}>
        <div className="sticky left-0 right-0 flex items-center justify-center">
          <Loader size={size} text={text} />
        </div>
      </td>
    </tr>
  );
}
