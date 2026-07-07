import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export default function Card({ children, className = "" }: CardProps) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm w-full max-w-full overflow-hidden ${className}`}>
      {children}
    </div>
  );
}
