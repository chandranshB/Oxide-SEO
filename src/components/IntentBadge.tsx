import React from 'react';

type Intent = 'Informational' | 'Commercial' | 'Transactional' | 'Navigational';

interface Props {
  intent: Intent | string;
  confidence?: 'high' | 'medium' | 'low';
}

export const IntentBadge: React.FC<Props> = ({ intent, confidence }) => {
  const normalizedIntent = intent.toString();
  
  let colors = "bg-zinc-800 text-zinc-400 border-zinc-700";
  let label = "Informational";
  
  if (normalizedIntent === 'Informational') {
    colors = "bg-blue-500/10 text-blue-400 border-blue-500/20";
    label = "Info";
  } else if (normalizedIntent === 'Commercial') {
    colors = "bg-purple-500/10 text-purple-400 border-purple-500/20";
    label = "Commercial";
  } else if (normalizedIntent === 'Transactional') {
    colors = "bg-green-500/10 text-green-400 border-green-500/20";
    label = "Transaction";
  } else if (normalizedIntent === 'Navigational') {
    colors = "bg-orange-500/10 text-orange-400 border-orange-500/20";
    label = "Navigation";
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border uppercase tracking-wider ${colors}`} title={confidence ? `Confidence: ${confidence}` : ''}>
      {label}
    </span>
  );
};
