/**
 * @file ComingSoon.tsx
 * @description Placeholder component for modular page routes that are currently under development.
 */

import React from "react";
import Card from "./Card";

interface ComingSoonProps {
  /** Page section title label */
  label: string;
  /** Lucide icon component */
  icon: React.ComponentType<{ size: number | string }>;
}

/**
 * Placeholder card view component.
 */
export default function ComingSoon({ label, icon: Icon }: ComingSoonProps) {
  return (
    <Card className="p-16 flex flex-col items-center justify-center text-center">
      <div className="h-14 w-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
        <Icon size={24} />
      </div>
      <div className="font-semibold text-slate-700">{label}</div>
      <div className="text-sm text-slate-400 mt-1 max-w-xs">
        This section isn't wired up in the demo yet — happy to build it out next.
      </div>
    </Card>
  );
}
