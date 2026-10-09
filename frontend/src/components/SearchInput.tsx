/**
 * @file SearchInput.tsx
 * @description Styled search text input component featuring a search icon prefix and clean focus styling.
 */

import React from "react";
import { Search } from "lucide-react";

interface SearchInputProps {
  /** Current text query value */
  value: string;
  /** Callback triggered when input value changes */
  onChange: (value: string) => void;
  /** Placeholder hint text */
  placeholder?: string;
  /** Optional size variant */
  size?: "sm" | "md";
  /** Optional container class name */
  className?: string;
}

/**
 * Standard search field input used across tables and list views.
 */
export default function SearchInput({
  value,
  onChange,
  placeholder,
  size = "md",
  className = "",
}: SearchInputProps) {
  const isSm = size === "sm";

  return (
    <div className={`relative ${className ? className : "flex-1 min-w-[200px]"}`}>
      <Search
        size={isSm ? 14 : 16}
        className={`absolute top-1/2 -translate-y-1/2 text-slate-400 ${isSm ? "left-2.5" : "left-3"}`}
      />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full border border-slate-200 rounded-lg bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 placeholder:text-slate-400 ${
          isSm ? "pl-8 pr-3 py-2 text-xs" : "pl-9 pr-3 py-2.5 text-sm"
        }`}
      />
    </div>
  );
}
