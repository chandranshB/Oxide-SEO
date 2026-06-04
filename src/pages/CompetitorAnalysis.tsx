import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { useToast } from '../components/Toast';
import { Search01Icon } from 'hugeicons-react';

interface Heading {
  tag: string;
  text: string;
}

interface KeywordFreq {
  word: string;
  count: number;
}

interface CompetitorData {
  title: string;
  meta_description: string;
  word_count: number;
  headings: Heading[];
  top_keywords: KeywordFreq[];
}

export const CompetitorAnalysis: React.FC = () => {
  const [url, setUrl] = useState('');
  const [data, setData] = useState<CompetitorData | null>(null);
  const [isScraping, setIsScraping] = useState(false);
  const { success, error: toastError } = useToast();

  const handleScrape = async () => {
    if (!url.trim()) return;
    setIsScraping(true);
    setData(null);
    try {
      const result = await invoke<CompetitorData>('scrape_competitor_outline', { url });
      setData(result);
    } catch (e) {
      console.error(e);
      toastError("Scrape Error: " + e);
    } finally {
      setIsScraping(false);
    }
  };

  const clearData = () => setData(null);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="flex justify-between items-start mb-8 pb-6 border-b border-[var(--border-strong)]">
        <div>
          <h1 className="text-2xl font-semibold mb-2">Competitor Analysis</h1>
          <p className="text-zinc-400">Scrape and analyze competitor content structure</p>
        </div>
      </header>

      <Card className="mb-8 flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-semibold">Comprehensive SEO Scraper</h2>
          <span className="text-[10px] uppercase tracking-widest font-bold text-[var(--accent-primary)] px-2 py-1 rounded-full bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20">
            Oxide SEO by shan
          </span>
        </div>
        <p className="text-zinc-400 text-sm mb-6">
          Enter a competitor's URL to instantly extract their full SEO sauce: Title, Meta Description, Word Count, Heading Structure, and Top Repeated Keywords.
        </p>
        <div className="flex gap-4 items-end mb-6">
          <div className="flex-1">
            <Input 
              label="Competitor URL" 
              placeholder="https://example.com/blog-post" 
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleScrape()}
              icon={<Search01Icon size={18} />}
            />
          </div>
          <Button onClick={handleScrape} disabled={isScraping || !url.trim()}>
            {isScraping ? 'Scraping...' : 'Scrape & Analyze'}
          </Button>
        </div>

        {data && (
          <div className="mt-2 pt-6 border-t border-[var(--border-strong)] flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-[var(--accent-primary)]">Analysis Results</h3>
              <div className="flex gap-2">
                <Button size="sm" variant="danger" onClick={clearData}>
                  Clear
                </Button>
              </div>
            </div>

            {/* Top Cards: Title, Meta, Word Count */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[var(--bg-base)] p-4 border border-[var(--border-subtle)] rounded-xl flex flex-col gap-1 md:col-span-2">
                <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Page Title</span>
                <span className="text-sm font-semibold text-white">{data.title || 'N/A'}</span>
                
                <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider mt-3">Meta Description</span>
                <span className="text-xs text-zinc-300 leading-relaxed">{data.meta_description || 'N/A'}</span>
              </div>
              <div className="bg-[var(--bg-base)] p-4 border border-[var(--border-subtle)] rounded-xl flex flex-col items-center justify-center gap-2">
                <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Word Count</span>
                <span className="text-4xl font-bold text-[var(--accent-primary)]">{data.word_count}</span>
              </div>
            </div>

            {/* Split layout: Headings and Keywords */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
              {/* Left Column: Heading Outline */}
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-semibold text-zinc-200">Heading Structure</h4>
                  <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => {
                    const text = data.headings.map(h => `${h.tag.toUpperCase()}: ${h.text}`).join('\n');
                    navigator.clipboard.writeText(text);
                    success('Copied structure to clipboard!');
                  }}>
                    Copy
                  </Button>
                </div>
                <div className="bg-[var(--bg-base)] p-5 border border-[var(--border-subtle)] rounded-xl overflow-y-auto max-h-[400px] flex flex-col gap-1">
                  {data.headings.length === 0 && <span className="text-zinc-500 text-sm">No headings found.</span>}
                  {data.headings.map((h, i) => {
                    const tag = h.tag.toLowerCase();
                    let marginLeft = 'ml-0';
                    let fontSize = 'text-[15px] font-semibold text-white';
                    let tagStyle = 'bg-[var(--accent-primary)] text-[var(--bg-base)] font-bold';
                    
                    if (tag === 'h2') {
                      marginLeft = 'ml-6';
                      fontSize = 'text-[14px] font-medium text-zinc-200';
                      tagStyle = 'bg-zinc-800 text-zinc-400 border border-zinc-700';
                    } else if (tag === 'h3') {
                      marginLeft = 'ml-12';
                      fontSize = 'text-[13px] text-zinc-400';
                      tagStyle = 'bg-transparent text-zinc-500';
                    }

                    return (
                      <div key={i} className={`py-1.5 px-3 hover:bg-[var(--bg-surface-hover)] rounded-lg transition-colors flex items-start gap-3 ${marginLeft}`}>
                        <span className={`inline-flex items-center justify-center w-7 h-5 rounded text-[10px] uppercase tracking-wider flex-shrink-0 mt-0.5 ${tagStyle}`}>
                          {h.tag}
                        </span>
                        <span className={`${fontSize} leading-snug pt-0.5`}>
                          {h.text}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Keyword Density */}
              <div className="flex flex-col gap-3">
                <h4 className="text-sm font-semibold text-zinc-200 py-1">Top Keywords (Density)</h4>
                <div className="bg-[var(--bg-base)] p-5 border border-[var(--border-subtle)] rounded-xl overflow-y-auto max-h-[400px]">
                  {data.top_keywords.length === 0 && <span className="text-zinc-500 text-sm">No text content found.</span>}
                  <div className="flex flex-col gap-3">
                    {data.top_keywords.map((kw, i) => {
                      const maxCount = data.top_keywords[0]?.count || 1;
                      const percentage = Math.max(2, (kw.count / maxCount) * 100);
                      
                      return (
                        <div key={i} className="flex items-center gap-4 group">
                          <span className="text-[13px] font-medium text-zinc-300 w-28 truncate text-right group-hover:text-white transition-colors" title={kw.word}>
                            {kw.word}
                          </span>
                          <div className="flex-1 h-6 bg-[var(--bg-surface)] rounded-md overflow-hidden relative border border-[var(--border-subtle)] shadow-inner">
                            <div 
                              className="absolute top-0 left-0 h-full bg-gradient-to-r from-[var(--accent-primary)] to-[#34d399] opacity-80 group-hover:opacity-100 transition-opacity" 
                              style={{ width: `${percentage}%` }}
                            />
                            <span className="absolute inset-y-0 left-3 flex items-center text-[11px] font-bold text-white drop-shadow-md mix-blend-difference">
                              {kw.count}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
