import React from "react";
import Card from "./Card";
import MiniSpark from "./MiniSpark";

interface StatCardProps {
  icon: React.ComponentType<any>;
  label: string;
  value: React.ReactNode;
  sub?: string;
  tint: string;
  spark?: string;
  sparkColor?: string;
}

export default function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  tint,
  spark,
  sparkColor
}: StatCardProps) {
  const textColor = tint.split(" ").find(c => c.startsWith("text-")) || "text-slate-700";

  return (
    <Card className="shadow-none p-5 flex items-center gap-4">
      <div className={`shrink-0 ${textColor}`}>
        <Icon size={24} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-slate-500">{label}</div>
        <div className="text-2xl font-bold text-slate-800 mt-0.5">{value}</div>
        {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
      </div>
      {spark && <MiniSpark points={spark} color={sparkColor} />}
    </Card>
  );
}
