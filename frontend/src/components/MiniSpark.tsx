import React from "react";

interface MiniSparkProps {
  color?: string;
  points: string;
}

export default function MiniSpark({ color = "#6366f1", points }: MiniSparkProps) {
  return (
    <svg width="70" height="30" viewBox="0 0 70 30" fill="none">
      <polyline
        points={points}
        stroke={color}
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
