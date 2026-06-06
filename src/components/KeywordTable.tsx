import React, { useState } from 'react';
import { IntentBadge } from './IntentBadge';
import { DifficultyBar } from './DifficultyBar';

interface Props {
  keywords: any[];
}

type SortField = 'keyword' | 'intent' | 'difficulty' | 'opportunity' | 'word_count' | 'source';

export const KeywordTable: React.FC<Props> = ({ keywords }) => {
  const [sortField, setSortField] = useState<SortField>('opportunity');
  const [sortDesc, setSortDesc] = useState(true);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDesc(!sortDesc);
    } else {
      setSortField(field);
      setSortDesc(true);
    }
  };

  const sortedKeywords = [...keywords].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];
    
    // Normalize intent for sorting
    if (sortField === 'intent') {
      aVal = typeof aVal === 'string' ? aVal : JSON.stringify(aVal);
      bVal = typeof bVal === 'string' ? bVal : JSON.stringify(bVal);
    }

    if (aVal < bVal) return sortDesc ? 1 : -1;
    if (aVal > bVal) return sortDesc ? -1 : 1;
    return 0;
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="opacity-0 group-hover:opacity-30 ml-1">↕</span>;
    return <span className="text-[var(--accent-primary)] ml-1">{sortDesc ? '↓' : '↑'}</span>;
  };

  return (
    <div className="w-full h-full overflow-auto">
      <table className="w-full text-left relative border-collapse">
        <thead className="bg-[#121214]/80 backdrop-blur-md text-zinc-500 text-[11px] font-medium uppercase tracking-widest sticky top-0 z-10 border-b border-[var(--border-subtle)]/50">
          <tr>
            <th className="px-5 py-4 cursor-pointer group whitespace-nowrap transition-colors hover:text-zinc-300" onClick={() => handleSort('keyword')}>
              Keyword <SortIcon field="keyword" />
            </th>
            <th className="px-5 py-4 cursor-pointer group transition-colors hover:text-zinc-300" onClick={() => handleSort('intent')}>
              Intent <SortIcon field="intent" />
            </th>
            <th className="px-5 py-4 cursor-pointer group transition-colors hover:text-zinc-300" onClick={() => handleSort('difficulty')}>
              Difficulty <SortIcon field="difficulty" />
            </th>
            <th className="px-5 py-4 cursor-pointer group transition-colors hover:text-zinc-300" onClick={() => handleSort('opportunity')}>
              Opportunity <SortIcon field="opportunity" />
            </th>
            <th className="px-5 py-4 cursor-pointer group whitespace-nowrap transition-colors hover:text-zinc-300" onClick={() => handleSort('word_count')}>
              Words <SortIcon field="word_count" />
            </th>
            <th className="px-5 py-4 cursor-pointer group transition-colors hover:text-zinc-300" onClick={() => handleSort('source')}>
              Source <SortIcon field="source" />
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedKeywords.map((kw, i) => (
            <tr key={i} className="hover:bg-white/[0.02] transition-colors group border-b border-[var(--border-subtle)]/30 last:border-0">
              <td className="px-5 py-5 text-zinc-200 font-medium text-[15px] whitespace-nowrap min-w-[200px]">
                {kw.keyword}
              </td>
              <td className="px-5 py-5 whitespace-nowrap">
                <IntentBadge intent={kw.intent} confidence={kw.intent_confidence} />
              </td>
              <td className="px-5 py-5 min-w-[120px] whitespace-nowrap opacity-80 group-hover:opacity-100 transition-opacity">
                <DifficultyBar score={kw.difficulty} label={kw.difficulty_label} showLabel={false} />
              </td>
              <td className="px-5 py-5 whitespace-nowrap">
                <span className={`font-semibold text-[15px] ${kw.opportunity >= 70 ? 'text-[var(--accent-primary)]' : kw.opportunity >= 40 ? 'text-blue-400' : 'text-zinc-500'}`}>
                  {kw.opportunity}
                </span>
              </td>
              <td className="px-5 py-5 text-zinc-400 text-[14px] whitespace-nowrap">
                {kw.word_count}
              </td>
              <td className="px-5 py-5 text-zinc-500 text-[13px] capitalize whitespace-nowrap">
                {kw.source}
              </td>
            </tr>
          ))}
          {sortedKeywords.length === 0 && (
            <tr>
              <td colSpan={6} className="p-12 text-center text-zinc-500 text-[13px]">
                No keywords found in this view.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
