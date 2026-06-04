import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { useToast } from '../components/Toast';
import { Search01Icon } from 'hugeicons-react';

export const KeywordVault: React.FC = () => {
  const [seedKeyword, setSeedKeyword] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isScraping, setIsScraping] = useState(false);
  const { success, error: toastError } = useToast();

  const handleScrape = async () => {
    if (!seedKeyword.trim()) return;
    setIsScraping(true);
    setSuggestions([]);
    try {
      const results = await invoke<string[]>('fetch_keyword_suggestions', { seed: seedKeyword });
      setSuggestions(results);
    } catch (e) {
      console.error(e);
      toastError("Scrape Error: " + e);
    } finally {
      setIsScraping(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto h-full flex flex-col">
      <header className="mb-8 pb-6 border-b border-[var(--border-strong)]">
        <h1 className="text-2xl font-semibold mb-2">Keyword Scraper</h1>
        <p className="text-zinc-400">Extract thousands of long-tail autocomplete suggestions for free.</p>
      </header>

      <Card className="flex flex-col flex-1 max-h-[80vh]">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-semibold">Free Autocomplete Scraper</h2>
          <span className="text-[10px] uppercase tracking-widest font-bold text-[var(--accent-primary)] px-2 py-1 rounded-full bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20">
            Oxide SEO by shan
          </span>
        </div>
        <p className="text-zinc-400 text-sm mb-6">
          Enter a seed keyword. We'll run a loop adding "a" through "z" to fetch massive long-tail suggestions directly from Google Autocomplete, completely bypassing API limits.
        </p>
        <div className="flex gap-4 items-end mb-6">
          <div className="flex-1">
            <Input 
              label="Seed Keyword" 
              placeholder="e.g. rust backend architecture" 
              value={seedKeyword}
              onChange={(e) => setSeedKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleScrape()}
              icon={<Search01Icon size={18} />}
            />
          </div>
          <Button onClick={handleScrape} disabled={isScraping || !seedKeyword.trim()} className="h-[42px] px-6">
            {isScraping ? 'Scraping...' : 'Scrape Suggestions'}
          </Button>
        </div>
        
        {suggestions.length > 0 && (
          <div className="mt-2 pt-6 border-t border-[var(--border-strong)] flex flex-col flex-1 min-h-0">
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
              <h3 className="text-sm font-medium text-[var(--accent-primary)]">Found {suggestions.length} keywords</h3>
              <div className="flex gap-2">
                <Button size="sm" variant="danger" onClick={() => setSuggestions([])}>
                  Clear
                </Button>
                <Button size="sm" variant="secondary" onClick={() => {
                  navigator.clipboard.writeText(suggestions.join('\n'));
                  success('Copied to clipboard!');
                }}>
                  Copy All
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 overflow-y-auto p-4 border border-[var(--border-subtle)] rounded-xl bg-[var(--bg-base)] flex-1 content-start">
              {suggestions.map((s, i) => (
                <span key={i} className="text-xs px-3 py-1.5 bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] transition-colors border border-[var(--border-strong)] rounded-lg text-zinc-300 shadow-sm">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
