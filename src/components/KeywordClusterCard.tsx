import React from 'react';
import { IntentBadge } from './IntentBadge';
import { DifficultyBar } from './DifficultyBar';
import { OpportunityBadge } from './OpportunityBadge';

interface Props {
  cluster: any;
  onClick: () => void;
  isSelected?: boolean;
}

export const KeywordClusterCard: React.FC<Props> = ({ cluster, onClick, isSelected }) => {
  return (
    <div 
      onClick={onClick}
      className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col gap-3 ${
        isSelected 
          ? 'bg-[var(--bg-surface-hover)] border-[var(--accent-primary)]/50 shadow-[0_0_15px_rgba(62,207,142,0.1)]' 
          : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface-hover)]'
      }`}
    >
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold text-zinc-100 text-lg capitalize">{cluster.label}</h3>
          <p className="text-xs text-zinc-500 mt-0.5">{cluster.keyword_count} keywords</p>
        </div>
        <OpportunityBadge score={cluster.avg_opportunity} />
      </div>

      <div className="flex gap-2 items-center mt-1">
        <IntentBadge intent={cluster.primary_intent} />
        <div className="w-px h-4 bg-zinc-800" />
        <div className="flex-1">
          <DifficultyBar score={cluster.avg_difficulty} />
        </div>
      </div>

      <div className="mt-2 pt-3 border-t border-[var(--border-subtle)]">
        <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2 font-semibold">Top Keywords</p>
        <div className="flex flex-col gap-1.5">
          {cluster.keywords.slice(0, 3).map((kw: any, i: number) => (
            <div key={i} className="flex justify-between items-center text-sm">
              <span className="text-zinc-300 truncate pr-2" title={kw.keyword}>{kw.keyword}</span>
              <span className="text-[10px] text-zinc-500 shrink-0">{kw.opportunity} opp</span>
            </div>
          ))}
          {cluster.keywords.length > 3 && (
            <div className="text-xs text-[var(--accent-primary)] mt-1 opacity-80">
              +{cluster.keywords.length - 3} more
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
