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
  return (
    <Card className="p-5 flex items-center gap-4">
      <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${tint}`}>
        <Icon size={20} />
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
