import React from "react";

interface ToggleProps {
  on: boolean;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

export default function Toggle({ on, onClick }: ToggleProps) {
  return (
    <button
      onClick={onClick}
      className={`h-6 w-11 rounded-full transition-colors relative shrink-0 ${on ? "bg-indigo-600" : "bg-slate-200"}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 bg-white rounded-full shadow transition-transform ${
          on ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
