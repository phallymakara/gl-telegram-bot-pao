/**
 * @file IconBtn.tsx
 * @description Compact action button component supporting default hover and danger tone styling.
 */

import React from "react";

interface IconBtnProps {
  /** Icon element to render inside button */
  children: React.ReactNode;
  /** Click event handler callback */
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  /** Tooltip text title */
  title?: string;
  /** Visual theme tone ("default" for primary blue hover, "danger" for red warning hover) */
  tone?: "default" | "danger";
}

/**
 * Icon button component for table row actions, edit, view, and delete buttons.
 */
export default function IconBtn({ children, onClick, title, tone = "default" }: IconBtnProps) {
  const tones = {
    default: "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50",
    danger: "text-rose-500 hover:text-rose-700 hover:bg-rose-50"
  };
  return (
    <button
      title={title}
      onClick={onClick}
      className={`h-8 w-8 inline-flex items-center justify-center rounded-lg transition-colors ${tones[tone]}`}
    >
      {children}
    </button>
  );
}
