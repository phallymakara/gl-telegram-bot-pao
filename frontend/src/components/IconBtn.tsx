import React from "react";

interface IconBtnProps {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  title?: string;
  tone?: "default" | "danger";
}

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
