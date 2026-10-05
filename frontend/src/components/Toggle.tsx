/**
 * @file Toggle.tsx
 * @description Smooth animated UI toggle switch component.
 */

import React from "react";

interface ToggleProps {
  /** Boolean state indicating whether switch is active */
  on: boolean;
  /** Click event handler callback */
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  /** Optional disabled state */
  disabled?: boolean;
}

/**
 * Toggle switch button component used for boolean settings and status switches.
 */
export default function Toggle({ on, onClick, disabled = false }: ToggleProps) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      } ${on ? "bg-indigo-600" : "bg-slate-300"}`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white transform transition duration-200 ease-in-out ${
          on ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}
