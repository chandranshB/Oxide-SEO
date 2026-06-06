import React from 'react';

interface Props {
  score: number;
  label?: string;
  showLabel?: boolean;
}

export const DifficultyBar: React.FC<Props> = ({ score, label, showLabel = true }) => {
  let color = "bg-green-500";
  if (score >= 80) color = "bg-red-500";
  else if (score >= 50) color = "bg-orange-500";
  else if (score >= 30) color = "bg-yellow-500";

  let displayLabel = label;
  if (!displayLabel) {
    if (score >= 80) displayLabel = "Very Hard";
    else if (score >= 50) displayLabel = "Hard";
    else if (score >= 30) displayLabel = "Medium";
    else displayLabel = "Easy";
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden w-16">
        <div 
          className={`h-full ${color} rounded-full`} 
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-[10px] text-zinc-400 font-medium min-w-[50px]">{displayLabel} ({score})</span>
      )}
    </div>
  );
};
