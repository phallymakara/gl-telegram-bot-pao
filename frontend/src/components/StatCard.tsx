/**
 * @file StatCard.tsx
 * @description Dashboard KPI metric card component displaying an icon, primary value metric, sub-label, and optional sparkline chart.
 */

import React from "react";
import Card from "./Card";
import MiniSpark from "./MiniSpark";

interface StatCardProps {
  /** Optional Lucide icon component */
  icon?: React.ComponentType<any>;
  /** Metric label description */
  label: string;
  /** Primary metric value (number, text, or element) */
  value: React.ReactNode;
  /** Secondary subtitle or helper context string */
  sub?: string;
  /** Tailwind color tint utility string */
  tint?: string;
  /** SVG sparkline path string */
  spark?: string;
  /** Sparkline stroke color */
  sparkColor?: string;
  /** Custom class name for value text */
  valueClassName?: string;
  /** Optional container class name */
  className?: string;
  /** If true, renders a reduced compact version */
  compact?: boolean;
}

/**
 * Metric KPI card component rendered across page headers and dashboard summaries.
 */
export default function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  tint = "bg-slate-50 text-slate-700",
  spark,
  sparkColor,
  valueClassName,
  className = "",
  compact = false,
}: StatCardProps) {
  const textColor = tint.split(" ").find(c => c.startsWith("text-")) || "text-slate-700";

  return (
    <Card className={`shadow-none ${compact ? "px-3.5 py-3.5 gap-2.5" : "p-4 gap-4"} flex items-center ${className}`}>
      {Icon && (
        <div className={`shrink-0 ${textColor}`}>
          <Icon size={compact ? 18 : 24} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className={`${compact ? "text-xs" : "text-xs sm:text-sm"} text-slate-500 font-medium truncate`}>
          {label}
        </div>
        <div
          className={`mt-0.5 ${
            valueClassName || (compact ? "text-xl font-bold text-slate-800" : "text-2xl font-bold text-slate-800")
          }`}
        >
          {value}
        </div>
        {sub && (
          <div className={`${compact ? "text-[11px]" : "text-xs"} text-slate-400 mt-0.5 truncate`}>
            {sub}
          </div>
        )}
      </div>
      {spark && <MiniSpark points={spark} color={sparkColor} />}
    </Card>
  );
}
