import React from 'react';

interface Props {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

export const OpportunityBadge: React.FC<Props> = ({ score, size = 'md' }) => {
  let color = "text-zinc-400 bg-zinc-800/50 border-zinc-700/50";
  if (score >= 80) color = "text-[var(--accent-primary)] bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]/20";
  else if (score >= 60) color = "text-blue-400 bg-blue-500/10 border-blue-500/20";
  else if (score >= 40) color = "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";

  const sizeClasses = {
    sm: "px-1.5 py-0.5 text-[10px]",
    md: "px-2 py-1 text-xs",
    lg: "px-3 py-1.5 text-sm",
  };

  return (
    <div className={`inline-flex items-center justify-center font-bold border rounded-lg ${color} ${sizeClasses[size]}`} title="Opportunity Score (0-100)">
      {score}
    </div>
  );
};
