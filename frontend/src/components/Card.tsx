/**
 * @file Card.tsx
 * @description Reusable card container component providing white background, rounded border, and overflow clipping.
 */

import React from "react";

interface CardProps {
  /** Node contents to render inside the card container */
  children: React.ReactNode;
  /** Optional custom CSS classes to extend layout styling */
  className?: string;
}

/**
 * Standard card wrapper component used for layout panels, tables, and widget containers.
 */
export default function Card({ children, className = "" }: CardProps) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 w-full max-w-full overflow-hidden ${className}`}>
      {children}
    </div>
  );
}
